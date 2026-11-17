if (!window.matchMedia("(hover: none)").matches) {
    window.lenis = new Lenis({
        autoRaf: true,

        prevent: function (node) {
            return node.closest(".formkit-overlay") !== null;
        }
    });

}
