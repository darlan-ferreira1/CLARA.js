// O aplicativo nativo é só uma "casca": abre uma janela com o WebView do
// sistema (WebView2 no Windows, WebKitGTK no Linux, WebView no Android) e
// carrega o mesmo site React/Three.js do GitHub Pages, empacotado junto.
// Toda a lógica dos experimentos continua em TypeScript (frontend/src).
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o CLARA.js");
}
