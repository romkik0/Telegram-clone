# Инструкция по деплою

## Шаг 1: Инициализация Git репозитория

Откройте командную строку (CMD) в папке проекта и выполните:

```bash
git init
git add .
git commit -m "Initial commit: Telegram clone"
```

## Шаг 2: Создание репозитория на GitHub

1. Зайдите на https://github.com
2. Нажмите "New repository"
3. Назовите репозиторий (например, "telegram-clone")
4. НЕ добавляйте README, .gitignore (они уже есть)
5. Нажмите "Create repository"

## Шаг 3: Загрузка кода на GitHub

Скопируйте команды из GitHub (они будут показаны после создания репозитория):

```bash
git remote add origin https://github.com/ВАШ_USERNAME/telegram-clone.git
git branch -M main
git push -u origin main
```

## Шаг 4: Деплой на Railway

### Вариант А: Через GitHub (рекомендуется)

1. Зайдите на https://railway.app
2. Нажмите "Start a New Project"
3. Выберите "Deploy from GitHub repo"
4. Авторизуйте Railway доступ к GitHub
5. Выберите ваш репозиторий "telegram-clone"
6. Railway автоматически определит настройки и задеплоит
7. После деплоя нажмите "Generate Domain" чтобы получить публичный URL

### Вариант Б: Через Railway CLI

```bash
# Установить Railway CLI
npm i -g @railway/cli

# Войти в аккаунт
railway login

# Инициализировать проект
railway init

# Задеплоить
railway up
```

## Шаг 5: Настройка домена (опционально)

В Railway:
1. Откройте ваш проект
2. Перейдите в Settings
3. В разделе "Domains" нажмите "Generate Domain"
4. Ваше приложение будет доступно по адресу типа: https://your-app.up.railway.app

## Альтернативные бесплатные хостинги

### Render.com (бесплатно навсегда)

1. Зайдите на https://render.com
2. Нажмите "New +" → "Web Service"
3. Подключите GitHub репозиторий
4. Настройки:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Нажмите "Create Web Service"

### Vercel (бесплатно навсегда)

```bash
# Установить Vercel CLI
npm i -g vercel

# Задеплоить
vercel
```

### Fly.io (бесплатно с лимитами)

```bash
# Установить Fly CLI
# Windows: скачайте с https://fly.io/docs/hands-on/install-flyctl/

# Войти
fly auth login

# Запустить деплой
fly launch

# Задеплоить
fly deploy
```

## Проверка работы

После деплоя откройте полученный URL в браузере. Вы должны увидеть рабочий Telegram clone!

## Обновление приложения

После внесения изменений в код:

```bash
git add .
git commit -m "Описание изменений"
git push
```

Railway/Render автоматически задеплоят новую версию!

## Troubleshooting

Если что-то не работает:

1. Проверьте логи в Railway/Render
2. Убедитесь что PORT правильно настроен (Railway автоматически устанавливает)
3. Проверьте что все файлы закоммичены в Git
4. Убедитесь что package.json содержит правильный start script

## Полезные команды Git

```bash
# Проверить статус
git status

# Посмотреть историю
git log

# Отменить изменения
git checkout -- .

# Создать новую ветку
git checkout -b feature-name

# Переключиться на main
git checkout main
```
