using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
using Shared;
using Shared.Services;

namespace RezkaComments;

// Серверный прокси комментариев Rezka.
// Вместо отдельного обхода антибот-защиты (Anubis) переиспользуем
// host + авторизованную cookie уже настроенного и рабочего модуля
// "Rezka" (тот же аккаунт, которым вы смотрите видео) — раз он уже
// проходит защиту сайта, комментарии пройдут тем же путём.
public class RezkaCommentsController : BaseController
{
    const string ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

    static readonly HttpClient client = new HttpClient(new HttpClientHandler
    {
        AutomaticDecompression = DecompressionMethods.All
    })
    {
        Timeout = TimeSpan.FromSeconds(15)
    };

    // Читаем секцию "Rezka" из init.conf (тот же файл/тот же формат,
    // что использует сам модуль Rezka) — host и cookie аккаунта.
    static (string host, string cookie) GetRezkaAccount()
    {
        JObject conf = null;
        try
        {
            conf = ModuleInvoke.Init("Rezka", new JObject());
        }
        catch
        {
            // конфиг не прочитался — работаем без cookie на дефолтном хосте
        }

        string host = conf?.Value<string>("host");
        if (string.IsNullOrEmpty(host))
            host = "https://rezka.ag";

        string cookie = conf?.Value<string>("cookie");

        return (host.TrimEnd('/'), cookie);
    }

    static bool LooksBlocked(string body)
    {
        if (string.IsNullOrEmpty(body))
            return true;

        return body.IndexOf("Проверяем, что вы не бот", StringComparison.OrdinalIgnoreCase) >= 0
            || body.IndexOf("Anubis", StringComparison.OrdinalIgnoreCase) >= 0
            || body.IndexOf("xess.min.css", StringComparison.OrdinalIgnoreCase) >= 0;
    }

    async static Task<string> GetAsync(string url, string referer, string cookie)
    {
        using (var req = new HttpRequestMessage(HttpMethod.Get, url))
        {
            req.Headers.TryAddWithoutValidation("User-Agent", ua);
            req.Headers.TryAddWithoutValidation("X-Requested-With", "XMLHttpRequest");
            if (!string.IsNullOrEmpty(referer))
                req.Headers.TryAddWithoutValidation("Referer", referer);
            if (!string.IsNullOrEmpty(cookie))
                req.Headers.TryAddWithoutValidation("Cookie", cookie);

            using (var resp = await client.SendAsync(req))
                return await resp.Content.ReadAsStringAsync();
        }
    }

    // GET /rezka-comments/search?q=...
    [HttpGet, AllowAnonymous]
    [Route("rezka-comments/search")]
    async public Task<ActionResult> Search(string q)
    {
        if (string.IsNullOrEmpty(q))
            return BadRequest("q is required");

        var (host, cookie) = GetRezkaAccount();
        string url = $"{host}/search/?do=search&subaction=search&q={Uri.EscapeDataString(q)}";
        string html = await GetAsync(url, host + "/", cookie);

        if (LooksBlocked(html))
            return StatusCode(502, "{\"error\":\"blocked_by_antibot\"}");

        return Content(html ?? "", "text/html; charset=utf-8");
    }

    // GET /rezka-comments/comments?id=...&page_url=...
    [HttpGet, AllowAnonymous]
    [Route("rezka-comments/comments")]
    async public Task<ActionResult> Comments(string id, string page_url = null)
    {
        if (string.IsNullOrEmpty(id))
            return BadRequest("id is required");

        var (host, cookie) = GetRezkaAccount();

        long t = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        string url = $"{host}/ajax/get_comments/?t={t}&news_id={Uri.EscapeDataString(id)}&cstart=1&type=0&comment_id=0&skin=hdrezka";
        string referer = !string.IsNullOrEmpty(page_url) ? page_url : host + "/";

        string json = await GetAsync(url, referer, cookie);

        if (LooksBlocked(json))
            return StatusCode(502, "{\"error\":\"blocked_by_antibot\"}");

        return Content(json ?? "{}", "application/json; charset=utf-8");
    }
}
