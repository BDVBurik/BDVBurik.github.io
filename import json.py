import json

# входной файл
input_file = "lampa_export.json"

# выходной файл
output_file = "franchises.json"

with open(input_file, "r", encoding="utf-8") as f:
    data = json.load(f)

result = []

for item in data:
    new_item = {}

    # обрабатываем массив m
    new_m = []

    for m_item in item.get("m", []):
        # пропускаем объекты с null t_id
        if m_item.get("t_id") is None:
            continue

        # оставляем только t_id
        new_m.append({
            "t_id": m_item["t_id"]
        })

    # добавляем только если есть элементы
    if new_m:
        new_item["m"] = new_m
        result.append(new_item)

with open(output_file, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print("Готово:", output_file)