@echo off
git add -A
git commit -m "feat: improved news quality - less strict filter, duplicate check, no image generation"
git push origin main
echo.
echo Done!
pause

