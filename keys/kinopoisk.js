(function () {
  "use strict";

  var kinopoisk_api_keys = [
    "7fdba022-d72e-43d7-aa82-4ce175c280a6",
    "1e6a0dbf-a4e1-4045-aa4a-dadee214c91d",
    "f8565f16-e10a-49b1-a260-b3a6dc819f57",
    "4a7ba7f7-31b6-4df3-8308-827ce7c1deb0",
    "465e660a-218c-4f1b-b072-ac7daa1b6e81",
    "ef840680-cb45-46e0-848f-784d70170480",
    "74d66e28-29f3-4523-b221-913844bb5813",
    "404dc583-7efc-4c93-8f21-a782f977b9e7",
    "beabaadb-89b1-4b9d-959d-c264c55e1773",
    "674fefd1-4dbd-4f7a-9d43-46b076f3a618",
    "f98a5461-d00d-4929-9a5c-e441318daba7",
    "c20595a1-3d8c-4cbd-92eb-fd7b0fa75c67",
    "68f2c7d6-bff8-4b72-985e-62d126775956",
  ];

  function getKinopoiskKey() {
    return kinopoisk_api_keys[
      Math.floor(Math.random() * kinopoisk_api_keys.length)
    ];
  }

  window.kinopoisk_api_keys = kinopoisk_api_keys;
  window.getKinopoiskKey = getKinopoiskKey;
})();
