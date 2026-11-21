export default async function run(page, ui) {
  // Fill login credentials
  await ui.fill('@e1', 'admin@kipsschool.ac');
  await ui.fill('@e2', 'KipsAdmin2024!');
  
  // Click Sign In
  await ui.click('@e6');
  await page.waitForTimeout(3000);
  
  // Snapshot after login to see what dashboard loads
  const snap = await ui.snapshot();
  const full = await ui.snapshot({full: true});
  
  return { 
    snapshot: snap, 
    full: full.slice(0, 5000),
    url: page.url()
  };
}
