/// Clasifica de forma ligera el propósito del mensaje del usuario a través de coincidencia de palabras clave
pub fn classify_user_intent(message: &str) -> &'static str {
    let lower = message.to_lowercase();

    if lower.contains("analiza") || lower.contains("conversacion") || lower.contains("historial") {
        "conversation_analysis"
    } else if lower.contains("error") || lower.contains("bug") || lower.contains("no funciona") {
        "technical_problem"
    } else if lower.contains("modelo") || lower.contains("temperatura") || lower.contains("api key")
    {
        "model_configuration"
    } else if lower.contains("funciona")
        || lower.contains("que hace")
        || lower.contains("como usar")
    {
        "feature_usage"
    } else if lower.contains("ayuda") || lower.contains("mejorar") {
        "app_improvement"
    } else {
        "general_question"
    }
}
