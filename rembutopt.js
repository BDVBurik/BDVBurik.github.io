(function () {
    'use strict';

    function removeOptionsButton() {
        var el = document.getElementsByClassName('button--options')[0];
        if (el) el.remove();
    }

    // ждём загрузку интерфейса Lampa
    Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') {
            setTimeout(removeOptionsButton, 500);
        }
    });

})();
