use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileTemplate {
    pub id: String,
    pub name: String,
    pub category: String,
    pub icon: String,
    pub base_role: String,
    pub base_personality: String,
    pub base_instructions: String,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileModifier {
    pub id: String,
    pub template_id: Option<String>,
    pub category: String,
    pub name: String,
    pub icon: String,
    pub extra_instructions: String,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveProfileConfig {
    pub template_id: Option<String>,
    pub selected_modifiers: Vec<String>,
    pub custom_notes: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompiledProfile {
    pub template: ProfileTemplate,
    pub modifiers: Vec<ProfileModifier>,
    pub custom_notes: String,
}

fn get_db_connection(app_data_dir: PathBuf) -> Result<Connection, String> {
    let db_path = app_data_dir.join("invisibleai.db");
    Connection::open(db_path).map_err(|e| format!("Failed to open DB: {}", e))
}

pub fn get_all_templates(app_data_dir: PathBuf) -> Result<Vec<ProfileTemplate>, String> {
    let conn = get_db_connection(app_data_dir)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, category, icon, base_role, base_personality, base_instructions, sort_order \
             FROM profile_templates ORDER BY sort_order ASC"
        )
        .map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([], |row| {
            Ok(ProfileTemplate {
                id: row.get(0)?,
                name: row.get(1)?,
                category: row.get(2)?,
                icon: row.get(3)?,
                base_role: row.get(4)?,
                base_personality: row.get(5)?,
                base_instructions: row.get(6)?,
                sort_order: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut templates = Vec::new();
    for t in iter {
        if let Ok(item) = t {
            templates.push(item);
        }
    }
    Ok(templates)
}

pub fn get_modifiers_for_template(
    app_data_dir: PathBuf,
    template_id: &str,
) -> Result<Vec<ProfileModifier>, String> {
    let conn = get_db_connection(app_data_dir)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, template_id, category, name, icon, extra_instructions, sort_order \
             FROM profile_modifiers \
             WHERE template_id IS NULL OR template_id = ? \
             ORDER BY category ASC, sort_order ASC",
        )
        .map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([template_id], |row| {
            Ok(ProfileModifier {
                id: row.get(0)?,
                template_id: row.get(1)?,
                category: row.get(2)?,
                name: row.get(3)?,
                icon: row.get(4)?,
                extra_instructions: row.get(5)?,
                sort_order: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut modifiers = Vec::new();
    for m in iter {
        if let Ok(item) = m {
            modifiers.push(item);
        }
    }
    Ok(modifiers)
}

pub fn get_active_profile_config(
    app_data_dir: PathBuf,
) -> Result<Option<ActiveProfileConfig>, String> {
    let conn = get_db_connection(app_data_dir)?;
    let result = conn.query_row(
        "SELECT template_id, selected_modifiers, custom_notes FROM active_profile_config WHERE id = 'current'",
        [],
        |row| {
            let template_id: Option<String> = row.get(0)?;
            let modifiers_json: String = row.get(1)?;
            let custom_notes: String = row.get(2)?;
            Ok((template_id, modifiers_json, custom_notes))
        },
    );

    match result {
        Ok((template_id, modifiers_json, custom_notes)) => {
            let selected_modifiers: Vec<String> =
                serde_json::from_str(&modifiers_json).unwrap_or_default();
            Ok(Some(ActiveProfileConfig {
                template_id,
                selected_modifiers,
                custom_notes,
            }))
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

pub fn set_active_template(app_data_dir: PathBuf, template_id: &str) -> Result<(), String> {
    let conn = get_db_connection(app_data_dir)?;

    let tid: Option<&str> = if template_id.is_empty() {
        None
    } else {
        Some(template_id)
    };

    conn.execute(
        "INSERT INTO active_profile_config (id, template_id, selected_modifiers, custom_notes, updated_at) \
         VALUES ('current', ?1, '[]', '', strftime('%s', 'now')) \
         ON CONFLICT(id) DO UPDATE SET template_id = ?1, selected_modifiers = '[]', updated_at = strftime('%s', 'now')",
        rusqlite::params![tid],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn toggle_modifier(app_data_dir: PathBuf, modifier_id: &str) -> Result<Vec<String>, String> {
    let conn = get_db_connection(app_data_dir)?;

    let current_json: String = conn
        .query_row(
            "SELECT selected_modifiers FROM active_profile_config WHERE id = 'current'",
            [],
            |row| row.get(0),
        )
        .unwrap_or_else(|_| "[]".to_string());

    let mut modifiers: Vec<String> = serde_json::from_str(&current_json).unwrap_or_default();

    if let Some(pos) = modifiers.iter().position(|m| m == modifier_id) {
        modifiers.remove(pos);
    } else {
        modifiers.push(modifier_id.to_string());
    }

    let new_json = serde_json::to_string(&modifiers).unwrap_or_else(|_| "[]".to_string());

    conn.execute(
        "UPDATE active_profile_config SET selected_modifiers = ?1, updated_at = strftime('%s', 'now') WHERE id = 'current'",
        rusqlite::params![new_json],
    ).map_err(|e| e.to_string())?;

    Ok(modifiers)
}

pub fn set_custom_notes(app_data_dir: PathBuf, notes: &str) -> Result<(), String> {
    let conn = get_db_connection(app_data_dir)?;
    conn.execute(
        "UPDATE active_profile_config SET custom_notes = ?1, updated_at = strftime('%s', 'now') WHERE id = 'current'",
        rusqlite::params![notes],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_compiled_profile(app_data_dir: PathBuf) -> Result<Option<CompiledProfile>, String> {
    let config = get_active_profile_config(app_data_dir.clone())?;
    let config = match config {
        Some(c) => c,
        None => return Ok(None),
    };

    let template_id = match config.template_id {
        Some(ref tid) if !tid.is_empty() => tid.clone(),
        _ => return Ok(None),
    };

    let conn = get_db_connection(app_data_dir)?;
    let template = conn.query_row(
        "SELECT id, name, category, icon, base_role, base_personality, base_instructions, sort_order \
         FROM profile_templates WHERE id = ?",
        [&template_id],
        |row| {
            Ok(ProfileTemplate {
                id: row.get(0)?,
                name: row.get(1)?,
                category: row.get(2)?,
                icon: row.get(3)?,
                base_role: row.get(4)?,
                base_personality: row.get(5)?,
                base_instructions: row.get(6)?,
                sort_order: row.get(7)?,
            })
        },
    ).map_err(|e| format!("Template not found: {}", e))?;

    let modifiers = if config.selected_modifiers.is_empty() {
        Vec::new()
    } else {
        let placeholders: Vec<String> = config
            .selected_modifiers
            .iter()
            .enumerate()
            .map(|(i, _)| format!("?{}", i + 1))
            .collect();
        let query = format!(
            "SELECT id, template_id, category, name, icon, extra_instructions, sort_order \
             FROM profile_modifiers WHERE id IN ({})",
            placeholders.join(", ")
        );

        let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
        let params: Vec<&dyn rusqlite::types::ToSql> = config
            .selected_modifiers
            .iter()
            .map(|s| s as &dyn rusqlite::types::ToSql)
            .collect();

        let iter = stmt
            .query_map(params.as_slice(), |row| {
                Ok(ProfileModifier {
                    id: row.get(0)?,
                    template_id: row.get(1)?,
                    category: row.get(2)?,
                    name: row.get(3)?,
                    icon: row.get(4)?,
                    extra_instructions: row.get(5)?,
                    sort_order: row.get(6)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut mods = Vec::new();
        for m in iter {
            if let Ok(item) = m {
                mods.push(item);
            }
        }
        mods
    };

    Ok(Some(CompiledProfile {
        template,
        modifiers,
        custom_notes: config.custom_notes,
    }))
}

pub fn compile_profile_prompt(profile: &CompiledProfile) -> String {
    let mut prompt = String::with_capacity(2048);

    prompt.push_str(&format!(
        "[IDENTIDAD DEL ASISTENTE]\n\
         Perfil Activo: {}\n\
         Rol: {}\n\
         Personalidad: {}\n\n\
         [INSTRUCCIONES PRINCIPALES DEL PERFIL]\n{}\n\n",
        profile.template.name,
        profile.template.base_role,
        profile.template.base_personality,
        profile.template.base_instructions
    ));

    if !profile.modifiers.is_empty() {
        prompt.push_str("[ENFOQUES Y TECNOLOGÍAS ACTIVAS]\n");

        let mut categories: std::collections::BTreeMap<String, Vec<&ProfileModifier>> =
            std::collections::BTreeMap::new();
        for m in &profile.modifiers {
            categories.entry(m.category.clone()).or_default().push(m);
        }

        for (category, mods) in &categories {
            prompt.push_str(&format!("  [{}]\n", category));
            for m in mods {
                prompt.push_str(&format!("  * {}: {}\n", m.name, m.extra_instructions));
            }
        }
        prompt.push('\n');
    }

    if !profile.custom_notes.trim().is_empty() {
        prompt.push_str(&format!(
            "[NOTAS ESPECÍFICAS DE ESTA SESIÓN]\n{}\n\n",
            profile.custom_notes.trim()
        ));
    }

    prompt
}
