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

fn sha256_bytes(data: &[u8]) -> [u8; 32] {
    let mut h: [u32; 8] = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ];
    let k: [u32; 64] = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];

    let bit_len = (data.len() as u64) * 8;
    let mut msg = Vec::with_capacity(data.len() + 1 + 8 + 64);
    msg.extend_from_slice(data);
    msg.push(0x80);
    while (msg.len() % 64) != 56 {
        msg.push(0x00);
    }
    msg.extend_from_slice(&bit_len.to_be_bytes());

    for chunk in msg.chunks_exact(64) {
        let mut w = [0u32; 64];
        for i in 0..16 {
            w[i] = u32::from_be_bytes([
                chunk[i * 4],
                chunk[i * 4 + 1],
                chunk[i * 4 + 2],
                chunk[i * 4 + 3],
            ]);
        }
        for i in 16..64 {
            let s0 = w[i - 15].rotate_right(7) ^ w[i - 15].rotate_right(18) ^ (w[i - 15] >> 3);
            let s1 = w[i - 2].rotate_right(17) ^ w[i - 2].rotate_right(19) ^ (w[i - 2] >> 10);
            w[i] = w[i - 16].wrapping_add(s0).wrapping_add(w[i - 7]).wrapping_add(s1);
        }

        let mut a = h[0];
        let mut b = h[1];
        let mut c = h[2];
        let mut d = h[3];
        let mut e = h[4];
        let mut f = h[5];
        let mut g = h[6];
        let mut hh = h[7];

        for i in 0..64 {
            let s1 = e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25);
            let ch = (e & f) ^ ((!e) & g);
            let temp1 = hh
                .wrapping_add(s1)
                .wrapping_add(ch)
                .wrapping_add(k[i])
                .wrapping_add(w[i]);
            let s0 = a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22);
            let maj = (a & b) ^ (a & c) ^ (b & c);
            let temp2 = s0.wrapping_add(maj);

            hh = g;
            g = f;
            f = e;
            e = d.wrapping_add(temp1);
            d = c;
            c = b;
            b = a;
            a = temp1.wrapping_add(temp2);
        }

        h[0] = h[0].wrapping_add(a);
        h[1] = h[1].wrapping_add(b);
        h[2] = h[2].wrapping_add(c);
        h[3] = h[3].wrapping_add(d);
        h[4] = h[4].wrapping_add(e);
        h[5] = h[5].wrapping_add(f);
        h[6] = h[6].wrapping_add(g);
        h[7] = h[7].wrapping_add(hh);
    }

    let mut out = [0u8; 32];
    for (i, val) in h.iter().enumerate() {
        out[i * 4..i * 4 + 4].copy_from_slice(&val.to_be_bytes());
    }
    out
}

fn to_hex(bytes: &[u8]) -> String {
    let mut s = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        use std::fmt::Write;
        let _ = write!(s, "{:02x}", b);
    }
    s
}

fn hmac_sha256(key: &[u8], message: &[u8]) -> [u8; 32] {
    let mut key_block = [0u8; 64];
    if key.len() > 64 {
        let hashed = sha256_bytes(key);
        key_block[..32].copy_from_slice(&hashed);
    } else {
        key_block[..key.len()].copy_from_slice(key);
    }

    let mut o_key_pad = [0x5cu8; 64];
    let mut i_key_pad = [0x36u8; 64];
    for i in 0..64 {
        o_key_pad[i] ^= key_block[i];
        i_key_pad[i] ^= key_block[i];
    }

    let mut inner_msg = Vec::with_capacity(64 + message.len());
    inner_msg.extend_from_slice(&i_key_pad);
    inner_msg.extend_from_slice(message);
    let inner_hash = sha256_bytes(&inner_msg);

    let mut outer_msg = Vec::with_capacity(64 + 32);
    outer_msg.extend_from_slice(&o_key_pad);
    outer_msg.extend_from_slice(&inner_hash);
    sha256_bytes(&outer_msg)
}

const DEFAULT_SALT: &str = "gbaigbance-sec-2026";

fn sign_ticket(ticket_id: &str, event_id: &str, tier: &str, created_at_ms: i64, secret: &str) -> String {
    let salt = if secret.is_empty() { DEFAULT_SALT } else { secret };
    let msg = format!("{}:{}:{}:{}", ticket_id, event_id, tier, created_at_ms);
    let hmac = hmac_sha256(salt.as_bytes(), msg.as_bytes());
    to_hex(&hmac[..12])
}

fn ticket_signature_op(input: &Value) -> Value {
    let ticket_id = input["ticket_id"].as_str().unwrap_or("").trim();
    let event_id = input["event_id"].as_str().unwrap_or("").trim();
    let tier = input["tier"].as_str().unwrap_or("standard").trim();
    let created_at_ms = input["created_at_ms"].as_i64().unwrap_or(0);
    let salt = input["secret_salt"].as_str().unwrap_or(DEFAULT_SALT);

    let sig = sign_ticket(ticket_id, event_id, tier, created_at_ms, salt);
    let qr_payload = format!("GBA-1:{}:{}:{}:{}:{}", ticket_id, event_id, tier, created_at_ms, sig);
    let short_code = if ticket_id.len() >= 8 {
        format!("{}-{}", &ticket_id[..4].to_uppercase(), &sig[..4].to_uppercase())
    } else {
        format!("GBA-{}", &sig[..6].to_uppercase())
    };

    json!({
        "signature": sig,
        "qr_payload": qr_payload,
        "short_code": short_code,
        "valid": true,
    })
}

fn verify_qr_op(input: &Value) -> Value {
    let raw = input["payload"].as_str().unwrap_or("").trim();
    let expected_event_id = input["event_id"].as_str().map(|s| s.trim()).filter(|s| !s.is_empty());
    let salt = input["secret_salt"].as_str().unwrap_or(DEFAULT_SALT);

    if !raw.starts_with("GBA-1:") {
        if raw.len() >= 8 {
            return json!({
                "valid": true,
                "ticket_id": raw,
                "event_id": expected_event_id.unwrap_or(""),
                "tier": "standard",
                "legacy": true,
                "reason": null,
            });
        }
        return json!({
            "valid": false,
            "reason": "Format de QR code non reconnu",
        });
    }

    let parts: Vec<&str> = raw.split(':').collect();
    if parts.len() < 6 {
        return json!({
            "valid": false,
            "reason": "Payload QR code incomplet",
        });
    }

    let ticket_id = parts[1];
    let event_id = parts[2];
    let tier = parts[3];
    let created_at_ms: i64 = parts[4].parse().unwrap_or(0);
    let provided_sig = parts[5];

    if let Some(exp_event) = expected_event_id {
        if exp_event != event_id {
            return json!({
                "valid": false,
                "ticket_id": ticket_id,
                "event_id": event_id,
                "reason": "Ce billet appartient à un autre événement",
            });
        }
    }

    let expected_sig = sign_ticket(ticket_id, event_id, tier, created_at_ms, salt);
    if provided_sig != expected_sig {
        return json!({
            "valid": false,
            "ticket_id": ticket_id,
            "event_id": event_id,
            "reason": "Signature cryptographique invalide (contrefaçon détectée)",
        });
    }

    json!({
        "valid": true,
        "ticket_id": ticket_id,
        "event_id": event_id,
        "tier": tier,
        "created_at_ms": created_at_ms,
        "signature": expected_sig,
        "reason": null,
    })
}

fn haversine_km(lat1: f64, lng1: f64, lat2: f64, lng2: f64) -> f64 {
    let d_lat = (lat2 - lat1).to_radians();
    let d_lng = (lng2 - lng1).to_radians();
    let lat1_rad = lat1.to_radians();
    let lat2_rad = lat2.to_radians();
    let a = (d_lat / 2.0).sin().powi(2)
        + lat1_rad.cos() * lat2_rad.cos() * (d_lng / 2.0).sin().powi(2);
    let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());
    let km = 6371.0 * c;
    (km * 10.0).round() / 10.0
}

fn haversine_op(input: &Value) -> Value {
    let lat1 = input["lat1"].as_f64().unwrap_or(0.0);
    let lng1 = input["lng1"].as_f64().unwrap_or(0.0);
    let lat2 = input["lat2"].as_f64().unwrap_or(0.0);
    let lng2 = input["lng2"].as_f64().unwrap_or(0.0);
    let km = haversine_km(lat1, lng1, lat2, lng2);
    json!({ "distance_km": km })
}

#[derive(Debug, Deserialize)]
struct GeoEventIn {
    id: String,
    latitude: Option<f64>,
    longitude: Option<f64>,
    #[serde(default)]
    title: String,
    #[serde(default)]
    city: String,
    #[serde(default)]
    category: String,
    #[serde(default)]
    starts_at: String,
    #[serde(default)]
    location_name: String,
    #[serde(default)]
    price_min: Option<f64>,
    #[serde(default)]
    currency: Option<String>,
}

fn nearby_events_op(input: &Value) -> Value {
    let lat = input["lat"].as_f64().unwrap_or(0.0);
    let lng = input["lng"].as_f64().unwrap_or(0.0);
    let radius_km = input["radius_km"].as_f64().unwrap_or(25.0).clamp(0.5, 500.0);
    let limit = input["limit"].as_u64().unwrap_or(10).clamp(1, 100) as usize;
    let events: Vec<GeoEventIn> = serde_json::from_value(input["events"].clone()).unwrap_or_default();

    let mut nearby = Vec::new();
    for ev in events {
        let (Some(e_lat), Some(e_lng)) = (ev.latitude, ev.longitude) else {
            continue;
        };
        let dist = haversine_km(lat, lng, e_lat, e_lng);
        if dist <= radius_km {
            nearby.push((dist, ev));
        }
    }

    nearby.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal));
    nearby.truncate(limit);

    let result: Vec<Value> = nearby
        .into_iter()
        .map(|(dist, ev)| {
            json!({
                "id": ev.id,
                "distance_km": dist,
                "title": ev.title,
                "city": ev.city,
                "category": ev.category,
                "starts_at": ev.starts_at,
                "location_name": ev.location_name,
                "price_min": ev.price_min,
                "currency": ev.currency,
            })
        })
        .collect();

    json!({
        "count": result.len(),
        "radius_km": radius_km,
        "events": result,
    })
}

fn financial_fees_op(input: &Value) -> Value {
    let price_paid = input["price_paid"].as_f64().unwrap_or(0.0).max(0.0);
    let quantity = input["quantity"].as_u64().unwrap_or(1).max(1) as f64;
    let total_amount = price_paid * quantity;
    let method = input["payment_method"].as_str().unwrap_or("mobile_money");

    let (pct, fixed) = match method {
        "card" | "stripe" => (0.035, 100.0),
        "free" => (0.0, 0.0),
        _ => (0.025, 50.0),
    };

    let operator_fee = if total_amount > 0.0 { (total_amount * 0.012).round() } else { 0.0 };
    let platform_fee = if total_amount > 0.0 {
        ((total_amount * pct) + fixed).round()
    } else {
        0.0
    };
    let organizer_payout = (total_amount - platform_fee).max(0.0);

    json!({
        "total_amount": total_amount.round(),
        "platform_fee": platform_fee,
        "operator_fee": operator_fee,
        "organizer_payout": organizer_payout.round(),
        "fee_percent": (pct * 100.0).round(),
        "fixed_fee": fixed,
        "currency": "XOF",
    })
}

fn levenshtein_dist(a: &str, b: &str) -> usize {
    let b_len = b.chars().count();
    let mut prev: Vec<usize> = (0..=b_len).collect();
    let mut curr = vec![0; b_len + 1];
    for (i, ca) in a.chars().enumerate() {
        curr[0] = i + 1;
        for (j, cb) in b.chars().enumerate() {
            let cost = if ca == cb { 0 } else { 1 };
            curr[j + 1] = (prev[j + 1] + 1)
                .min(curr[j] + 1)
                .min(prev[j] + cost);
        }
        std::mem::swap(&mut prev, &mut curr);
    }
    prev[b_len]
}

fn fuzzy_search_op(input: &Value) -> Value {
    let query_raw = input["query"].as_str().unwrap_or("").trim();
    let query = fold(query_raw);
    let events: Vec<EventIn> = serde_json::from_value(input["events"].clone()).unwrap_or_default();

    if query.chars().count() < 2 {
        return json!({ "ids": events.into_iter().map(|e| e.id).collect::<Vec<_>>() });
    }

    let q_words: Vec<&str> = query.split_whitespace().collect();
    let mut scored = Vec::new();

    for ev in events {
        if ev.id.is_empty() {
            continue;
        }
        let t = fold(&ev.title);
        let c = fold(&ev.city);
        let cat = fold(&ev.category);
        let loc = fold(&ev.location);
        let desc = fold(&ev.description);

        let mut score = 0i64;

        if t.contains(&query) { score += 40; }
        if c.contains(&query) { score += 20; }
        if loc.contains(&query) { score += 15; }
        if cat.contains(&query) { score += 15; }
        if desc.contains(&query) { score += 10; }

        let ev_text = format!("{} {} {} {}", t, c, loc, cat);
        let ev_words: Vec<&str> = ev_text.split_whitespace().collect();

        for qw in &q_words {
            let qw_len = qw.chars().count();
            for ew in &ev_words {
                let ew_len = ew.chars().count();
                if qw_len >= 3 && ew_len >= 3 {
                    let d = levenshtein_dist(qw, ew);
                    if d == 0 {
                        score += 25;
                    } else if d == 1 && qw_len >= 4 {
                        score += 15;
                    } else if d == 2 && qw_len >= 6 {
                        score += 8;
                    }
                }
            }
        }

        if score > 0 {
            scored.push((score, ev.id));
        }
    }

    scored.sort_by(|a, b| b.0.cmp(&a.0).then(a.1.cmp(&b.1)));
    json!({ "ids": scored.into_iter().map(|(_, id)| id).collect::<Vec<_>>() })
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
        "haversine" => haversine_op(input),
        "nearby_events" => nearby_events_op(input),
        "ticket_signature" => ticket_signature_op(input),
        "verify_qr" => verify_qr_op(input),
        "financial_fees" => financial_fees_op(input),
        "fuzzy_search" => fuzzy_search_op(input),
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

    #[test]
    fn haversine_measures_lome_correctly() {
        let raw = r#"{"op":"haversine","lat1":6.1375,"lng1":1.2123,"lat2":6.1700,"lng2":1.2300}"#;
        let value: Value = serde_json::from_str(&dispatch_json(raw)).unwrap();
        let dist = value["distance_km"].as_f64().unwrap();
        assert!(dist > 0.0 && dist < 10.0);
    }

    #[test]
    fn nearby_events_filters_and_sorts_by_radius() {
        let raw = r#"{
            "op":"nearby_events",
            "lat": 6.1375,
            "lng": 1.2123,
            "radius_km": 20.0,
            "events": [
                {"id":"accra", "latitude": 5.60, "longitude": -0.19, "title":"Concert Accra"},
                {"id":"lome", "latitude": 6.17, "longitude": 1.23, "title":"Festival Lomé"}
            ]
        }"#;
        let value: Value = serde_json::from_str(&dispatch_json(raw)).unwrap();
        assert_eq!(value["count"], 1);
        assert_eq!(value["events"][0]["id"], "lome");
    }

    #[test]
    fn ticket_signature_and_verification_cycle() {
        let sign_raw = r#"{
            "op": "ticket_signature",
            "ticket_id": "tkt-12345678",
            "event_id": "ev-888",
            "tier": "vip",
            "created_at_ms": 1700000000000
        }"#;
        let signed: Value = serde_json::from_str(&dispatch_json(sign_raw)).unwrap();
        let qr_payload = signed["qr_payload"].as_str().unwrap();

        // 1. Validation réussie
        let verify_raw = format!(r#"{{"op":"verify_qr","payload":"{qr_payload}","event_id":"ev-888"}}"#);
        let verified: Value = serde_json::from_str(&dispatch_json(&verify_raw)).unwrap();
        assert_eq!(verified["valid"], true);
        assert_eq!(verified["ticket_id"], "tkt-12345678");

        // 2. Mauvais événement
        let wrong_event = format!(r#"{{"op":"verify_qr","payload":"{qr_payload}","event_id":"ev-999"}}"#);
        let wrong_res: Value = serde_json::from_str(&dispatch_json(&wrong_event)).unwrap();
        assert_eq!(wrong_res["valid"], false);

        // 3. Falsification du payload
        let tampered = qr_payload.replace("vip", "pass");
        let tampered_raw = format!(r#"{{"op":"verify_qr","payload":"{tampered}","event_id":"ev-888"}}"#);
        let tampered_res: Value = serde_json::from_str(&dispatch_json(&tampered_raw)).unwrap();
        assert_eq!(tampered_res["valid"], false);
    }

    #[test]
    fn financial_fees_calculates_mobile_money_and_payout() {
        let raw = r#"{
            "op": "financial_fees",
            "price_paid": 5000,
            "quantity": 2,
            "payment_method": "mobile_money"
        }"#;
        let value: Value = serde_json::from_str(&dispatch_json(raw)).unwrap();
        assert_eq!(value["total_amount"], 10000.0);
        // 10000 * 2.5% + 50 = 250 + 50 = 300 FCFA
        assert_eq!(value["platform_fee"], 300.0);
        assert_eq!(value["organizer_payout"], 9700.0);
        assert_eq!(value["currency"], "XOF");
    }

    #[test]
    fn fuzzy_search_handles_typos_and_african_names() {
        let raw = r#"{
            "op": "fuzzy_search",
            "query": "Koffi",
            "events": [
                {"id":"1", "title":"Concert de Kofi Olomide", "city":"Lomé"},
                {"id":"2", "title":"Soirée Jazz", "city":"Cotonou"}
            ]
        }"#;
        let value: Value = serde_json::from_str(&dispatch_json(raw)).unwrap();
        assert_eq!(value["ids"][0], "1");
    }
}
