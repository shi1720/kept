import {test,expect} from '@playwright/test';
test('compact layouts keep guide controls, settings and long uploads within the viewport',async({page})=>{
 await page.setViewportSize({width:320,height:844});
 await page.request.post('/api/auth/demo',{data:{as:'freelancer'}});await page.goto('/app');
 const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
 for(let i=0;i<6;i++){
  const close=await dialog.getByRole('button',{name:'Close',exact:true}).boundingBox();
  const progress=await dialog.getByRole('progressbar').boundingBox();
  expect(close!.x).toBeGreaterThan(progress!.x+progress!.width);
  expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy();
  await dialog.getByRole('button',{name:i===5?'Start exploring':'Next',exact:true}).click();
 }
 await page.goto('/app/settings');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await expect(page.locator('nav').getByRole('link',{name:'Settings',exact:true}).last()).toHaveAttribute('aria-current','page');
 await page.getByRole('tab',{name:'AI providers'}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 const pacts=(await(await page.request.get('/api/pacts')).json()).pacts;
 await page.goto('/app/pacts/'+pacts.find((p:{title:string})=>p.title.startsWith('Pre-order')).id);
 await page.getByRole('button',{name:'Submit work',exact:true}).click();await page.getByRole('tab',{name:'Files',exact:true}).click();
 const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Choose deliverable files'}).focus();await page.keyboard.press('Enter');
 const filename='final-client-approved-deliverable-with-a-very-long-filename-for-mobile-layout-check.txt';
 await(await chooser).setFiles({name:filename,mimeType:'text/plain',buffer:Buffer.from('Delivery test')});
 await expect(page.getByRole('button',{name:'Remove '+filename})).toBeVisible();
 expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBeTruthy();
 await page.keyboard.press('Escape');await expect(dialog).toBeHidden();
 await expect(page.getByRole('button',{name:'Submit work',exact:true})).toBeFocused();
});

test('sidebar collapse persists and guide remains reachable from the account menu',async({page})=>{
 await page.request.post('/api/auth/demo',{data:{as:'freelancer'}});await page.goto('/app');await page.getByRole('button',{name:'Skip guide'}).click();
 await expect(page.locator('aside').getByRole('button',{name:'Collapse sidebar'})).toBeVisible();await page.getByRole('button',{name:'Collapse sidebar'}).click();await expect(page.locator('#workspace-sidebar')).toHaveCSS('width','84px');
 await page.reload();await expect(page.getByRole('button',{name:'Expand sidebar'})).toHaveAttribute('aria-expanded','false');
 await page.getByRole('button',{name:/account menu/}).click();await page.getByRole('menuitem',{name:'Getting started guide'}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Expand sidebar'}).click();await expect(page.locator('#workspace-sidebar')).toHaveCSS('width','248px');
});

test('ops table changes preserve page position for short and empty tables',async({page})=>{
 await page.request.post('/api/auth/demo',{data:{as:'freelancer'}});await page.goto('/app');await page.getByRole('button',{name:'Skip guide'}).click();
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:830});await page.goto('/admin');
  await page.locator('[role=tablist]').evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+window.scrollY-80));
  for(const name of ['Ledger','PayPal activity','AI decisions','Disputes','Webhooks','Escrow book']){
   const before=await page.evaluate(()=>scrollY);await page.getByRole('tab',{name:new RegExp(name)}).click();
   await expect(page.getByRole('tab',{name:new RegExp(name)})).toHaveAttribute('aria-selected','true');
   await expect.poll(async()=>Math.abs(await page.evaluate(()=>scrollY)-before)).toBeLessThanOrEqual(2);
  }
 }
});
