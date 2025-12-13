(function () {
  "use strict";

  class WeatherWidget {
    constructor() {
      this.html = null;
      this.isTimeVisible = true;
      this.API_KEY = "46a5d8546cc340f69d9123207242801";
    }

    create() {
      this.html = $(`
        <div class="weather-widget" style="display:none;">
          <div class="weather-temp" id="weather-temp"></div>
          <div class="weather-condition" id="weather-condition"></div>
        </div>
      `);
    }

    async getWeatherData(position) {
      try {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const url = `https://api.weatherapi.com/v1/current.json?key=${this.API_KEY}&q=${lat},${lon}&lang=uk&aqi=no`;

        const response = await fetch(url);
        if (!response.ok) throw new Error("Weather API error");

        const result = await response.json();
        const temp = Math.floor(result.current.temp_c);
        const condition = result.current.condition.text;

        $("#weather-temp").text(temp + "°");
        $("#weather-condition")
          .text(condition)
          .toggleClass("long-text", condition.length > 10);
      } catch (e) {
        console.error("Error retrieving weather data", e);
      }
    }

    async getWeatherByIP() {
      try {
        const response = await fetch("https://ip-api.com/json");
        const locationData = await response.json();
        const position = {
          coords: {
            latitude: 46.74574, // координаты Хмельницкого
            longitude: 23.49375,
          },
        };
        this.getWeatherData(position);
      } catch (e) {
        console.error("Error retrieving location by IP", e);
      }
    }

    getWeather() {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          this.getWeatherData.bind(this),
          this.getWeatherByIP.bind(this)
        );
      } else {
        this.getWeatherByIP();
      }
    }

    render() {
      return this.html;
    }

    destroy() {
      this.html?.remove();
      this.html = null;
    }

    initToggle() {
      const toggleDisplay = () => {
        $(".head__time").toggle(this.isTimeVisible);
        this.html.toggle(!this.isTimeVisible);
        this.isTimeVisible = !this.isTimeVisible;
      };
      setInterval(toggleDisplay, 10000);
    }

    adjustWidth() {
      const width = document.querySelector(".head__time")?.offsetWidth || 100;
      $(".weather-widget, .head__time").css("width", width + "px");
    }
  }

  $(document).ready(function () {
    setTimeout(() => {
      const widget = new WeatherWidget();
      widget.create();
      $(".head__time").after(widget.render());
      widget.adjustWidth();
      widget.initToggle();
      widget.getWeather();
    }, 2000); // можно 5000, если нужна задержка
  });
})();
