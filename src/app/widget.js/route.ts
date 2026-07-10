const SCRIPT = `
(function () {
  var currentScript = document.currentScript;

  function init() {
    if (!currentScript) return;

    var scriptUrl = new URL(currentScript.src);
    var botId = scriptUrl.searchParams.get("bot");
    if (!botId) return;

    var iframe = document.createElement("iframe");
    iframe.src =
      scriptUrl.origin + "/widget-embed?bot=" + encodeURIComponent(botId);
    iframe.title = "Chat";
    iframe.setAttribute("allowtransparency", "true");
    iframe.style.cssText =
      "position:fixed;bottom:0;right:0;width:70px;height:70px;" +
      "max-width:100vw;max-height:100vh;border:none;background:transparent;" +
      "z-index:2147483647;transition:width 0.2s ease,height 0.2s ease;";

    window.addEventListener("message", function (event) {
      if (event.source !== iframe.contentWindow) return;

      var data = event.data;
      if (
        !data ||
        data.source !== "zorion-chat-widget" ||
        data.type !== "resize"
      ) {
        return;
      }

      iframe.style.width = data.width + "px";
      iframe.style.height = data.height + "px";
    });

    document.body.appendChild(iframe);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
`;

export async function GET() {
  return new Response(SCRIPT, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
    },
  });
}
