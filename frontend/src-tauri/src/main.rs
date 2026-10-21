// Sem janela de console no Windows em modo release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    clarajs_lib::run()
}
