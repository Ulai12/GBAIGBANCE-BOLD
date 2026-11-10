//! Cœur numérique de Gbaigbance.
//! Les totaux, la synchro et le classement passent ici pour éviter
//! les doubles comptages et les dates décalées du fuseau.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};

#[derive(Debug, Deserialize)]
struct TicketIn {
    id: String,
    #[serde(default)]
    price_paid: f64,
    #[serde(default)]
    status: String,
    #[serde(default)]
    created_at_ms: i64,
    #[serde(default)]
    event_id: String,
    #[serde(default)]
    ticket_type: String,
    /// `server` gagne toujours sur `local` pour le même id.
    #[serde(default)]
    source: String,
}

#[derive(Debug, Deserialize)]
struct EventIn {
    #[serde(default)]
    id: String,
    #[serde(default)]
    category: String,
    #[serde(default)]
    attendees: i64,
    #[serde(default)]
    views: i64,
    #[serde(default)]
    likes: i64,
    #[serde(default)]
    featured: bool,
    #[serde(default)]
    starts_at_ms: i64,
    #[serde(default)]
    active: bool,
    #[serde(default)]
    title: String,
    #[serde(default)]
    city: String,
    #[serde(default)]
    description: String,
    #[serde(default)]
    location: String,
    #[serde(default)]
    terminated: bool,
}

#[derive(Debug, Serialize)]
struct Share {
    id: String,
    count: u64,
    amount: f64,
    percent: u32,
}

fn cancelled(status: &str) -> bool {
    matches!(
        status,
        "cancelled" | "canceled" | "refunded" | "failed"
    )
}

fn dedupe_tickets(tickets: &[TicketIn]) -> Vec<&TicketIn> {
    let mut order: Vec<String> = Vec::new();
    let mut map: HashMap<String, &TicketIn> = HashMap::new();
    for ticket in tickets {
        let id = ticket.id.trim();
        if id.is_empty() {
            continue;
        }
        if let Some(prev) = map.get(id) {
            // Le serveur écrase le cache local, jamais l'inverse.
            if prev.source != "server" && ticket.source == "server" {
                map.insert(id.to_string(), ticket);
            }
            continue;
        }
        order.push(id.to_string());
        map.insert(id.to_string(), ticket);
    }
    order
        .into_iter()
        .filter_map(|id| map.remove(&id))
        .filter(|ticket| !cancelled(&ticket.status))
        .collect()
}

/// Plus fort reste : les pourcentages entiers somment exactement 100.
fn largest_remainder(weights: &[f64]) -> Vec<u32> {
    let total: f64 = weights.iter().copied().sum();
    if total <= 0.0 {
        return vec![0; weights.len()];
    }
    let mut floors = Vec::with_capacity(weights.len());
    let mut remainders = Vec::with_capacity(weights.len());
    let mut assigned = 0u32;
    for (index, weight) in weights.iter().enumerate() {
        let exact = weight / total * 100.0;
        let floor = exact.floor() as u32;
        assigned += floor;
        floors.push(floor);
        remainders.push((index, exact - exact.floor()));
    }
    remainders.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    let mut cursor = 0;
    while assigned < 100 && !remainders.is_empty() {
        let index = remainders[cursor % remainders.len()].0;
        floors[index] += 1;
        assigned += 1;
        cursor += 1;
        if cursor > weights.len() * 2 {
            break;
        }
    }
    floors
}

fn civil_from_days(mut z: i64) -> (i32, u32, u32) {
    z += 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = (z - era * 146_097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146_096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    (y as i32, m as u32, d as u32)
}

fn ymd(ms: i64, offset_min: i32) -> Option<(i32, u32, u32)> {
    if ms <= 0 {
        return None;
    }
    let local = ms + i64::from(offset_min) * 60_000;
    let days = local.div_euclid(86_400_000);
    Some(civil_from_days(days))
}

fn add_months(year: i32, month: u32, delta: i32) -> (i32, u32) {
    let index = (year * 12 + month as i32 - 1) + delta;
    let y = index.div_euclid(12);
    let m = (index.rem_euclid(12) as u32) + 1;
    (y, m)
}

fn week_index(day: u32) -> usize {
    if day <= 7 {
        0
    } else if day <= 14 {
        1
    } else if day <= 21 {
        2
    } else {
        3
    }
}

#[derive(Clone, Serialize)]
struct Bucket {
    year: i32,
    month: u32,
    week: Option<u32>,
    tickets: u64,
    revenue: f64,
    attendees: i64,
    events: u64,
}

fn empty_weeks(year: i32, month: u32) -> Vec<Bucket> {
    (0..4)
        .map(|week| Bucket {
            year,
            month,
            week: Some(week),
            tickets: 0,
            revenue: 0.0,
            attendees: 0,
            events: 0,
        })
        .collect()
}

fn platform_stats(input: &Value) -> Value {
    let tickets: Vec<TicketIn> = serde_json::from_value(input["tickets"].clone()).unwrap_or_default();
    let events: Vec<EventIn> = serde_json::from_value(input["events"].clone()).unwrap_or_default();
    let kept = dedupe_tickets(&tickets);
    let total_tickets = kept.len() as u64;
    let total_revenue: f64 = kept.iter().map(|ticket| ticket.price_paid.max(0.0)).sum();
    let active: Vec<&EventIn> = events.iter().filter(|event| event.active).collect();
    let total_views: i64 = events.iter().map(|event| event.views.max(0)).sum();
    let users = input["users"].as_u64().unwrap_or(0);

    let mut category_of: HashMap<&str, &str> = HashMap::new();
    for event in &events {
        if !event.id.is_empty() && !event.category.is_empty() {
            category_of.insert(event.id.as_str(), event.category.as_str());
        }
    }

    let mut revenue_by_cat: HashMap<String, (u64, f64)> = HashMap::new();
    for ticket in &kept {
        let Some(category) = category_of.get(ticket.event_id.as_str()) else {
            continue;
        };
        let entry = revenue_by_cat.entry((*category).to_string()).or_insert((0, 0.0));
        entry.0 += 1;
        entry.1 += ticket.price_paid.max(0.0);
    }

    let basis = if revenue_by_cat.values().any(|(_, amount)| *amount > 0.0) {
        "revenue"
    } else {
        "events"
    };

    let mut pairs: Vec<(String, u64, f64)> = if basis == "revenue" {
        revenue_by_cat
            .into_iter()
            .filter(|(_, (_, amount))| *amount > 0.0 || false)
            .map(|(id, (count, amount))| (id, count, amount))
            .collect()
    } else {
        let mut counts: HashMap<String, u64> = HashMap::new();
        for event in &active {
            if event.category.is_empty() {
                continue;
            }
            *counts.entry(event.category.clone()).or_insert(0) += 1;
        }
        counts.into_iter().map(|(id, count)| (id, count, 0.0)).collect()
    };
    pairs.sort_by(|a, b| b.2.partial_cmp(&a.2).unwrap_or(std::cmp::Ordering::Equal).then(b.1.cmp(&a.1)));
    let weights: Vec<f64> = if basis == "revenue" {
        pairs.iter().map(|(_, _, amount)| *amount).collect()
    } else {
        pairs.iter().map(|(_, count, _)| *count as f64).collect()
    };
    let percents = largest_remainder(&weights);
    let shares: Vec<Share> = pairs
        .into_iter()
        .zip(percents)
        .map(|((id, count, amount), percent)| Share {
            id,
            count,
            amount,
            percent,
        })
        .collect();

    let timeline: Vec<Value> = kept
        .iter()
        .filter(|ticket| ticket.created_at_ms > 0)
        .map(|ticket| {
            json!({
                "created_at_ms": ticket.created_at_ms,
                "price_paid": ticket.price_paid.max(0.0),
                "event_id": ticket.event_id,
            })
        })
        .collect();

    json!({
        "total_tickets": total_tickets,
        "total_revenue": total_revenue.round(),
        "total_events": active.len(),
        "total_views": total_views.max(0),
        "total_users": users,
        "category_basis": basis,
        "category_shares": shares,
        "timeline": timeline,
    })
}

fn timeline(input: &Value) -> Value {
    let offset = input["tz_offset_min"].as_i64().unwrap_or(0) as i32;
    let now_ms = input["now_ms"].as_i64().unwrap_or(0);
    let period = input["period"].as_str().unwrap_or("current_month");
    let Some((year, month, _)) = ymd(now_ms, offset) else {
        return json!({ "buckets": [] });
    };

    let tickets: Vec<TicketIn> = serde_json::from_value(input["tickets"].clone()).unwrap_or_default();
    let events: Vec<EventIn> = serde_json::from_value(input["events"].clone()).unwrap_or_default();

    let (mut buckets, mode_weeks) = if period == "quarter" {
        let (y1, m1) = add_months(year, month, -2);
        let (y2, m2) = add_months(year, month, -1);
        (
            vec![
                Bucket { year: y1, month: m1, week: None, tickets: 0, revenue: 0.0, attendees: 0, events: 0 },
                Bucket { year: y2, month: m2, week: None, tickets: 0, revenue: 0.0, attendees: 0, events: 0 },
                Bucket { year, month, week: None, tickets: 0, revenue: 0.0, attendees: 0, events: 0 },
            ],
            false,
        )
    } else {
        let (y, m) = if period == "last_month" {
            add_months(year, month, -1)
        } else {
            (year, month)
        };
        (empty_weeks(y, m), true)
    };

    let place = |buckets: &mut [Bucket], y: i32, m: u32, day: u32, weeks: bool| -> Option<usize> {
        if weeks {
            if buckets.first().map(|bucket| bucket.year == y && bucket.month == m).unwrap_or(false) {
                Some(week_index(day))
            } else {
                None
            }
        } else {
            buckets.iter().position(|bucket| bucket.year == y && bucket.month == m)
        }
    };

    for ticket in tickets.iter().filter(|ticket| !cancelled(&ticket.status)) {
        let Some((y, m, d)) = ymd(ticket.created_at_ms, offset) else {
            continue;
        };
        if let Some(index) = place(&mut buckets, y, m, d, mode_weeks) {
            buckets[index].tickets += 1;
            buckets[index].revenue += ticket.price_paid.max(0.0);
        }
    }
    for event in &events {
        let Some((y, m, d)) = ymd(event.starts_at_ms, offset) else {
            continue;
        };
        if let Some(index) = place(&mut buckets, y, m, d, mode_weeks) {
            buckets[index].events += 1;
            buckets[index].attendees += event.attendees.max(0);
        }
    }

    json!({ "buckets": buckets })
}

fn merge_tickets(input: &Value) -> Value {
    let server: Vec<String> = serde_json::from_value(input["server_ids"].clone()).unwrap_or_default();
    let local: Vec<String> = serde_json::from_value(input["local_ids"].clone()).unwrap_or_default();
    let drop_ids: HashSet<String> = serde_json::from_value::<Vec<String>>(input["drop_ids"].clone())
        .unwrap_or_default()
        .into_iter()
        .collect();
    let mut seen = HashSet::new();
    let mut ids = Vec::new();
    for id in server.into_iter().chain(local) {
        let id = id.trim().to_string();
        if id.is_empty() || drop_ids.contains(&id) || !seen.insert(id.clone()) {
            continue;
        }
        ids.push(id);
    }
    json!({ "ids": ids })
}

fn rank_events(input: &Value) -> Value {
    let mut events: Vec<EventIn> = serde_json::from_value(input["events"].clone()).unwrap_or_default();
    events.sort_by(|a, b| {
        let score = |event: &EventIn| {
            let featured = if event.featured { 500 } else { 0 };
            featured + event.attendees.max(0) * 4 + (event.views.max(0) * 3) / 2 + event.likes.max(0) * 3
        };
        score(b).cmp(&score(a)).then(a.id.cmp(&b.id))
    });
    let ids: Vec<String> = events.into_iter().map(|event| event.id).filter(|id| !id.is_empty()).collect();
    json!({ "ids": ids })
}

fn push_folded(out: &mut String, ch: char) {
    // to_ascii_lowercase laisse « É » intact : la recherche ratait les titres.
    let lower = ch.to_lowercase().next().unwrap_or(ch);
    let mapped = match lower {
        'à' | 'á' | 'â' | 'ä' | 'ã' | 'å' => "a",
        'ç' => "c",
        'é' | 'è' | 'ê' | 'ë' => "e",
        'í' | 'ì' | 'î' | 'ï' => "i",
        'ñ' => "n",
        'ó' | 'ò' | 'ô' | 'ö' | 'õ' => "o",
        'ú' | 'ù' | 'û' | 'ü' => "u",
        'ý' | 'ÿ' => "y",
        'œ' => "oe",
        'æ' => "ae",
        other => {
            out.push(other);
            return;
        }
    };
    out.push_str(mapped);
}

fn fold(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for ch in value.chars() {
        push_folded(&mut out, ch);
    }
    out
}

fn search_events(input: &Value) -> Value {
    let query = fold(input["query"].as_str().unwrap_or("")).trim().to_string();
    let events: Vec<EventIn> = serde_json::from_value(input["events"].clone()).unwrap_or_default();
    if query.chars().count() < 2 {
        return json!({ "ids": events.into_iter().map(|event| event.id).collect::<Vec<_>>() });
    }
    let min_score = input["min_score"].as_i64().unwrap_or(1);
    let mut scored: Vec<(i64, String)> = events
        .into_iter()
        .filter_map(|event| {
            if event.id.is_empty() {
                return None;
            }
            let title = fold(&event.title);
            let city = fold(&event.city);
            let category = fold(&event.category);
            let location = fold(&event.location);
            let description = fold(&event.description);
            let mut score = 0i64;
            if title.contains(&query) {
                score += 5;
            }
            if city.contains(&query) {
                score += 3;
            }
            if location.contains(&query) {
                score += 2;
            }
            if category.contains(&query) {
                score += 2;
            }
            if description.contains(&query) {
                score += 1;
            }
            if score < min_score {
                return None;
            }
            Some((score, event.id))
        })
        .collect();
    scored.sort_by(|a, b| b.0.cmp(&a.0).then(a.1.cmp(&b.1)));
    // Les résultats du serveur restent visibles : les correspondances passent devant.
    let ids: Vec<String> = scored.into_iter().map(|(_, id)| id).collect();
    json!({ "ids": ids })
}

fn organizer_series(input: &Value) -> Value {
    let offset = input["tz_offset_min"].as_i64().unwrap_or(0) as i32;
    let now_ms = input["now_ms"].as_i64().unwrap_or(0);
    let days = input["days"].as_u64().unwrap_or(7).clamp(1, 120) as i64;
    let parsed: Vec<TicketIn> =
        serde_json::from_value(input["tickets"].clone()).unwrap_or_default();
    let tickets = dedupe_tickets(&parsed);
    let Some((y0, m0, d0)) = ymd(now_ms, offset) else {
        return json!({ "points": [], "tickets": 0, "revenue": 0, "by_type": [] });
    };
    let today = days_from_civil(y0, m0, d0);
    let mut points = Vec::new();
    for back in (0..days).rev() {
        let (y, m, d) = civil_from_days(today - back);
        points.push(Bucket {
            year: y,
            month: m,
            week: Some(d),
            tickets: 0,
            revenue: 0.0,
            attendees: 0,
            events: 0,
        });
    }
    let mut by_type: HashMap<String, (u64, f64)> = HashMap::new();
    let mut total_tickets = 0u64;
    let mut total_revenue = 0.0f64;
    for ticket in &tickets {
        total_tickets += 1;
        let price = ticket.price_paid.max(0.0);
        total_revenue += price;
        let key = if ticket.ticket_type.trim().is_empty() {
            "standard".to_string()
        } else {
            ticket.ticket_type.to_lowercase()
        };
        let entry = by_type.entry(key).or_insert((0, 0.0));
        entry.0 += 1;
        entry.1 += price;
        let Some((y, m, d)) = ymd(ticket.created_at_ms, offset) else {
            continue;
        };
        if let Some(point) = points.iter_mut().find(|point| point.year == y && point.month == m && point.week == Some(d)) {
            point.tickets += 1;
            point.revenue += price;
        }
    }
    let window_tickets: u64 = points.iter().map(|point| point.tickets).sum();
    let window_revenue: f64 = points.iter().map(|point| point.revenue).sum();
    let mut cumulative_tickets = total_tickets.saturating_sub(window_tickets);
    let mut cumulative_revenue = total_revenue - window_revenue;
    let series: Vec<Value> = points
        .iter()
        .map(|point| {
            cumulative_tickets += point.tickets;
            cumulative_revenue += point.revenue;
            json!({
                "year": point.year,
                "month": point.month,
                "day": point.week.unwrap_or(1),
                "tickets_sold": point.tickets,
                "revenue": point.revenue.round(),
                "cumulative_tickets": cumulative_tickets,
                "cumulative_revenue": cumulative_revenue.round(),
            })
        })
        .collect();
    let by_type: Vec<Value> = by_type
        .into_iter()
        .filter(|(_, (count, _))| *count > 0)
        .map(|(key, (count, revenue))| json!({ "key": key, "count": count, "revenue": revenue.round() }))
        .collect();
    json!({
        "points": series,
        "tickets": total_tickets,
        "revenue": total_revenue.round(),
        "by_type": by_type,
    })
}

fn days_from_civil(year: i32, month: u32, day: u32) -> i64 {
    let y = if month <= 2 { year as i64 - 1 } else { year as i64 };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = (y - era * 400) as u64;
    let mp = if month > 2 { month - 3 } else { month + 9 };
    let doy = (153 * mp as u64 + 2) / 5 + day as u64 - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146_097 + doe as i64 - 719_468
}

fn trend(input: &Value) -> Value {
    let now_ms = input["now_ms"].as_i64().unwrap_or(0);
    let mut scored: Vec<(i64, String)> = Vec::new();
    let events: Vec<EventIn> = serde_json::from_value(input["events"].clone()).unwrap_or_default();
    for event in events {
        if event.id.is_empty() || event.terminated {
            continue;
        }
        // Même pondération que l'accueil : likes×3 + jauge×4 + vues×0,5, bonus de proximité.
        let mut score = event.likes.max(0) * 3
            + event.attendees.max(0) * 4
            + event.views.max(0) / 2;
        if event.starts_at_ms > 0 && now_ms > 0 {
            let days = (event.starts_at_ms - now_ms) as f64 / 86_400_000.0;
            if (0.0..=7.0).contains(&days) {
                score += 20;
            }
            if (0.0..=2.0).contains(&days) {
                score += 15;
            }
        }
        scored.push((score, event.id));
    }
    scored.sort_by(|a, b| b.0.cmp(&a.0).then(a.1.cmp(&b.1)));
    json!({ "ids": scored.into_iter().map(|(_, id)| id).collect::<Vec<_>>() })
}

fn stock(input: &Value) -> Value {
    let sold = input["sold"].as_f64().unwrap_or(0.0).max(0.0);
    let capacity = input["capacity"].as_f64().unwrap_or(0.0).max(0.0);
    let remaining = (capacity - sold).max(0.0);
    let percent = if capacity > 0.0 {
        ((sold / capacity) * 100.0).round().min(100.0) as u32
    } else {
        0
    };
    json!({
        "remaining": remaining.round() as u64,
        "percent_sold": percent,
    })
}

fn dispatch_value(input: &Value) -> Value {
    match input["op"].as_str().unwrap_or("") {
        "platform_stats" => platform_stats(input),
        "timeline" => timeline(input),
        "merge" => merge_tickets(input),
        "rank" => rank_events(input),
        "search" => search_events(input),
        "organizer_series" => organizer_series(input),
        "stock" => stock(input),
        "trend" => trend(input),
        _ => json!({ "error": "operation inconnue" }),
    }
}

pub fn dispatch_json(raw: &str) -> String {
    let parsed: Value = serde_json::from_str(raw).unwrap_or(json!({}));
    dispatch_value(&parsed).to_string()
}

static mut LAST_LEN: usize = 0;

#[no_mangle]
pub extern "C" fn gba_alloc(len: usize) -> *mut u8 {
    let mut buffer = Vec::<u8>::with_capacity(len);
    unsafe {
        buffer.set_len(len);
    }
    let ptr = buffer.as_mut_ptr();
    std::mem::forget(buffer);
    ptr
}

#[no_mangle]
pub extern "C" fn gba_free(ptr: *mut u8, len: usize) {
    if ptr.is_null() || len == 0 {
        return;
    }
    unsafe {
        let _ = Vec::from_raw_parts(ptr, len, len);
    }
}

#[no_mangle]
pub extern "C" fn gba_last_len() -> usize {
    unsafe { LAST_LEN }
}

#[no_mangle]
pub extern "C" fn gba_exec(ptr: *const u8, len: usize) -> *mut u8 {
    let input = if ptr.is_null() || len == 0 {
        &[][..]
    } else {
        unsafe { std::slice::from_raw_parts(ptr, len) }
    };
    let text = std::str::from_utf8(input).unwrap_or("{}");
    let out = dispatch_json(text).into_bytes();
    let out_len = out.len();
    let out_ptr = gba_alloc(out_len);
    unsafe {
        if out_len > 0 {
            std::ptr::copy_nonoverlapping(out.as_ptr(), out_ptr, out_len);
        }
        LAST_LEN = out_len;
    }
    out_ptr
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn local_copy_does_not_double_charge() {
        let raw = r#"{
          "op":"platform_stats",
          "users": 4,
          "tickets":[
            {"id":"a","price_paid":5000,"status":"valid","source":"server","event_id":"e1","created_at_ms":1},
            {"id":"a","price_paid":5000,"status":"valid","source":"local","event_id":"e1","created_at_ms":1},
            {"id":"b","price_paid":0,"status":"cancelled","source":"server","created_at_ms":1}
          ],
          "events":[{"id":"e1","category":"concert","active":true,"views":10}]
        }"#;
        let value: Value = serde_json::from_str(&dispatch_json(raw)).unwrap();
        assert_eq!(value["total_tickets"], 1);
        assert_eq!(value["total_revenue"], 5000.0);
        assert_eq!(value["total_users"], 4);
        assert_eq!(value["category_shares"][0]["percent"], 100);
    }

    #[test]
    fn server_cancellation_hides_local_valid_copy() {
        let raw = r#"{
          "op":"platform_stats",
          "users":1,
          "tickets":[
            {"id":"a","price_paid":2000,"status":"valid","source":"local"},
            {"id":"a","price_paid":2000,"status":"cancelled","source":"server"}
          ],
          "events":[]
        }"#;
        let value: Value = serde_json::from_str(&dispatch_json(raw)).unwrap();
        assert_eq!(value["total_tickets"], 0);
        assert_eq!(value["total_revenue"], 0.0);
    }

    #[test]
    fn timeline_stays_inside_the_month() {
        // 2026-11-10 12:00 UTC, offset 0. Octobre ne doit pas entrer dans « ce mois ».
        let november = 1_762_776_000_000i64;
        let october = 1_759_334_400_000i64;
        let raw = format!(
            r#"{{"op":"timeline","period":"current_month","now_ms":{november},"tz_offset_min":0,
            "tickets":[{{"id":"a","created_at_ms":{october},"price_paid":1000,"status":"valid"}},{{"id":"b","created_at_ms":{november},"price_paid":2500,"status":"valid"}}],
            "events":[]}}"#
        );
        let value: Value = serde_json::from_str(&dispatch_json(&raw)).unwrap();
        let tickets: u64 = value["buckets"]
            .as_array()
            .unwrap()
            .iter()
            .map(|bucket| bucket["tickets"].as_u64().unwrap())
            .sum();
        assert_eq!(tickets, 1);
        assert_eq!(value["buckets"][1]["tickets"], 1);
    }

    #[test]
    fn percents_sum_to_100() {
        let parts = largest_remainder(&[1.0, 1.0, 1.0]);
        assert_eq!(parts.iter().sum::<u32>(), 100);
    }

    #[test]
    fn search_ignores_accents() {
        let raw = r#"{"op":"search","query":"EVENEMENT","events":[
          {"id":"1","title":"Événement de Kofi","city":"Lomé"},
          {"id":"2","title":"Match","city":"Cotonou"}
        ]}"#;
        let value: Value = serde_json::from_str(&dispatch_json(raw)).unwrap();
        assert_eq!(value["ids"], json!(["1"]));
    }

    #[test]
    fn trend_puts_near_events_first() {
        let now = 1_700_000_000_000i64;
        let soon = now + 86_400_000;
        let later = now + 20 * 86_400_000;
        let raw = format!(
            r#"{{"op":"trend","now_ms":{now},"events":[
              {{"id":"later","likes":0,"attendees":0,"views":0,"starts_at_ms":{later}}},
              {{"id":"soon","likes":1,"attendees":1,"views":1,"starts_at_ms":{soon}}},
              {{"id":"done","terminated":true,"likes":999,"starts_at_ms":{soon}}}
            ]}}"#
        );
        let value: Value = serde_json::from_str(&dispatch_json(&raw)).unwrap();
        assert_eq!(value["ids"][0], "soon");
        assert_eq!(value["ids"].as_array().unwrap().len(), 2);
    }

    #[test]
    fn merge_prefers_server_and_drops_cancelled() {
        let raw = r#"{"op":"merge","server_ids":["a","c"],"local_ids":["b","a"],"drop_ids":["c"]}"#;
        let value: Value = serde_json::from_str(&dispatch_json(raw)).unwrap();
        assert_eq!(value["ids"], json!(["a", "b"]));
    }

    #[test]
    fn stock_never_passes_100() {
        let value: Value = serde_json::from_str(&dispatch_json(r#"{"op":"stock","sold":12,"capacity":10}"#)).unwrap();
        assert_eq!(value["percent_sold"], 100);
        assert_eq!(value["remaining"], 0);
    }
}
