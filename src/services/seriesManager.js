import { getDb } from '../db/database.js';

const SERIES_TEMPLATES = [
  { name: 'ИИ-инструменты недели', parts: 5, description: 'Каждый день — один AI-инструмент для работы' },
  { name: 'Будущее через 5 лет', parts: 3, description: 'Прогнозы о технологиях ближайшего будущего' },
  { name: 'ИИ vs Человек', parts: 4, description: 'Области где ИИ уже обгоняет людей' },
  { name: 'Нейросети для бизнеса', parts: 5, description: 'Практические кейсы использования ИИ' },
  { name: 'Мифы об ИИ', parts: 3, description: 'Разрушаем популярные заблуждения' },
  { name: 'ИИ-стартапы месяца', parts: 4, description: 'Самые интересные стартапы в AI' },
  { name: 'Гайд: нейросети с нуля', parts: 5, description: 'Для тех, кто хочет разобраться в AI' }
];

export class SeriesManager {
  getActiveSeries() {
    const db = getDb();
    return db.prepare("SELECT * FROM series WHERE status = 'active' ORDER BY created_at DESC LIMIT 1").get();
  }

  startSeries(name = null, totalParts = null) {
    const db = getDb();
    db.prepare("UPDATE series SET status = 'completed', updated_at = datetime('now') WHERE status = 'active'").run();

    if (!name) {
      const template = SERIES_TEMPLATES[Math.floor(Math.random() * SERIES_TEMPLATES.length)];
      name = template.name;
      totalParts = template.parts;
    }

    const result = db
      .prepare('INSERT INTO series (name, total_parts, current_part) VALUES (?, ?, 0)')
      .run(name, totalParts || 3);

    console.log(`📌 Новая серия: "${name}" (${totalParts} частей)`);
    return result.lastInsertRowid;
  }

  getNextPart() {
    const series = this.getActiveSeries();
    if (!series) return null;

    if (series.current_part >= series.total_parts) {
      const db = getDb();
      db.prepare("UPDATE series SET status = 'completed', updated_at = datetime('now') WHERE id = ?").run(series.id);
      return null;
    }

    const nextPart = series.current_part + 1;

    return {
      seriesId: series.id,
      seriesName: series.name,
      partNumber: nextPart,
      totalParts: series.total_parts,
      isLast: nextPart === series.total_parts,
      prefix: `📌 **${series.name} | Часть ${nextPart} из ${series.total_parts}**`
    };
  }

  markPartPublished(seriesId) {
    const db = getDb();
    db.prepare("UPDATE series SET current_part = current_part + 1, updated_at = datetime('now') WHERE id = ?").run(
      seriesId
    );
  }

  shouldStartNewSeries() {
    const active = this.getActiveSeries();
    return !active || active.current_part >= active.total_parts;
  }

  getSeriesHistory(limit = 10) {
    const db = getDb();
    return db.prepare('SELECT * FROM series ORDER BY created_at DESC LIMIT ?').all(limit);
  }
}
