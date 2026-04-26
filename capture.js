const puppeteer = require('puppeteer');
(async () => {
  try {
    console.log('Launching browser...');
    // Specify the explicit path to Chromium/Chrome if the local puppeteer doesn't have it downloaded, 
    // but the puppeteer install should have downloaded it.
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 375, height: 812 });

    console.log('Navigating to app...');
    await page.goto('https://vocabraly-marathon-pass-tan.vercel.app/', { waitUntil: 'networkidle0' });
    
    // Wait an extra second for UI
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: 'C:\\Users\\makoto\\Documents\\GitHub\\Vocabraly-Marathon-PassTan\\app_top.png' });
    console.log('Top screen captured.');

    console.log('Clicking grade button...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.grade-btn'));
      if(btns.length > 0) btns[0].click();
    });
    
    await new Promise(r => setTimeout(r, 500));
    
    console.log('Clicking start...');
    await page.click('#startBtn');
    
    // Wait for quiz screen
    await page.waitForSelector('#quizScreen.active', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 2000)); // wait for question to load
    
    await page.screenshot({ path: 'C:\\Users\\makoto\\Documents\\GitHub\\Vocabraly-Marathon-PassTan\\app_quiz.png' });
    console.log('Quiz screen captured.');

    await browser.close();
    console.log('Done.');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
