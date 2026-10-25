// O aplicativo nativo é só uma "casca": abre uma janela com o WebView do
// sistema (WebView2 no Windows, WebKitGTK no Linux, WebView no Android) e
// carrega o mesmo site React/Three.js do GitHub Pages, empacotado junto.
// Toda a lógica dos experimentos continua em TypeScript (frontend/src).
use tauri::webview::{PermissionKind, PermissionResponse};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Câmera: a página do app é nossa (não há sites de terceiros), então
        // o pedido da webcam dos experimentos de gestos é liberado direto,
        // sem a caixa de permissão do WebView. O resto segue o padrão.
        .on_permission_request(|_, kind| match kind {
            PermissionKind::Camera => PermissionResponse::Allow,
            _ => PermissionResponse::Default,
        })
        .setup(|_app| {
            // No Linux, o WebKitGTK vem com a câmera (getUserMedia) desligada.
            #[cfg(target_os = "linux")]
            {
                use tauri::Manager;
                use webkit2gtk::{SettingsExt, WebViewExt};
                if let Some(window) = _app.get_webview_window("main") {
                    window.with_webview(|webview| {
                        if let Some(settings) = webview.inner().settings() {
                            settings.set_enable_media_stream(true);
                            // O <video> da webcam começa sem clique do usuário.
                            settings.set_media_playback_requires_user_gesture(false);
                        }
                    })?;
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o CLARA.js");
}
