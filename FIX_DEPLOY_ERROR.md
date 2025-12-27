# 🔧 Исправление ошибки деплоя GitHub Actions

## Проблема

При деплое через GitHub Actions возникла ошибка:
```
npm ci can only install packages when your package.json and package-lock.json are in sync
```

## Причина

Файлы `package.json` и `package-lock.json` **не синхронизированы**. 
В `package.json` были добавлены/обновлены зависимости, но `package-lock.json` не был обновлен соответственно.

## Решение (Windows PowerShell)

### Шаг 1: Обновить package-lock.json

Откройте **PowerShell** в папке проекта и выполните:

```powershell
# Удалить node_modules и package-lock.json
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue

# Установить все зависимости заново
npm install

# Проверить что всё работает
npm run server
```

### Шаг 2: Закоммитить изменения

```powershell
# Добавить обновленный package-lock.json
git add package-lock.json

# Закоммитить
git commit -m "fix: sync package-lock.json with package.json"

# Отправить в GitHub
git push origin main
```

### Шаг 3: Проверить деплой

После push в GitHub:
1. Перейдите в **Actions** tab на GitHub
2. Дождитесь завершения деплоя
3. Проверьте что деплой прошел успешно ✅

---

## Альтернативное решение (если первое не сработало)

### Использовать npm install вместо npm ci в GitHub Actions

Измените `.github/workflows/deploy.yml`:

```yaml
# Было:
- name: Install dependencies
  run: npm ci

# Станет:
- name: Install dependencies
  run: npm install
```

**Примечание:** `npm install` более снисходителен к несовпадениям, но `npm ci` быстрее и надежнее для CI/CD.

---

## Быстрое исправление (одна команда)

```powershell
# Выполните в PowerShell:
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue; Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue; npm install; git add package-lock.json; git commit -m "fix: sync package-lock.json"; git push origin main
```

---

## Проверка синхронизации

После выполнения команд, проверьте:

```powershell
# Проверить что package-lock.json создан
Test-Path package-lock.json  # Должно быть True

# Проверить что изменения есть в git
git status

# Должно показать:
# modified:   package-lock.json
```

---

## Что делать если ошибка повторяется?

1. **Обновите npm:**
```powershell
npm install -g npm@latest
```

2. **Очистите кэш npm:**
```powershell
npm cache clean --force
```

3. **Переустановите всё с нуля:**
```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
```

4. **Проверьте версию Node.js:**
```powershell
node --version  # Должно быть >= 18.0.0
```

---

## Автоматическая проверка перед коммитом

Создайте файл `.husky/pre-commit` (требует установки husky):

```bash
#!/bin/sh
npm install --package-lock-only
git add package-lock.json
```

Это автоматически обновит `package-lock.json` при каждом коммите.

---

**После исправления деплой должен пройти успешно! 🚀**


