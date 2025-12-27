@echo off
echo Fixing deploy error...
echo.
echo Step 1: Removing node_modules...
if exist node_modules rmdir /s /q node_modules
echo.
echo Step 2: Removing package-lock.json...
if exist package-lock.json del /f package-lock.json
echo.
echo Step 3: Installing dependencies...
call npm install
echo.
echo Step 4: Adding to git...
git add package-lock.json
echo.
echo Step 5: Committing...
git commit -m "fix: sync package-lock.json with package.json"
echo.
echo Step 6: Pushing to GitHub...
git push origin main
echo.
echo Done! Check GitHub Actions now.
pause


