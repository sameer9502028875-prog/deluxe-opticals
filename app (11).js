/* Delux Opticals customer catalogue + guest orders + owner console.
   Real orders require the Supabase database in database/setup.sql.
   No customer personal data is stored in localStorage. */
(() => {
'use strict';
const cfg = window.DELUXE_CONFIG || {};
const cardStyle=document.createElement('style');cardStyle.textContent=".product-card .card-add-below{position:static!important;display:flex!important;justify-content:center;align-items:center;width:100%!important;height:auto!important;min-height:38px!important;margin-top:12px;padding:10px 8px!important;border:1px solid #19191b!important;border-radius:5px!important;background:#19191b!important;color:#fff!important;box-shadow:none!important;font:700 11px/1.3 'DM Sans',sans-serif!important;cursor:pointer}.product-card .card-add-below:hover{background:#d92c3b!important;border-color:#d92c3b!important}.product-card .card-add-below:disabled{opacity:.45;cursor:not-allowed}";document.head.appendChild(cardStyle);
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const rupees = n => '₹' + Number(n || 0).toLocaleString('en-IN');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let managedBrands=[],galleryPhotos=[],galleryIndex=0,editingPhotos=[];
let db=null, products=[], isDemo=true, catalogueStatus='loading', activeCategory='All', activeBrand='All', query='', cart=readCart(), activePanel='', installEvent=null, owner=false, lastOrders=[], toastTimer;
function readCart(){try{const c=JSON.parse(localStorage.getItem('deluxe_cart_v1'));return Array.isArray(c)?c.filter(x=>x && typeof x.id==='string' && Number.isInteger(x.qty) && x.qty>0).slice(0,10):[]}catch{return []}}
function saveCart(){try{localStorage.setItem('deluxe_cart_v1',JSON.stringify(cart))}catch{}drawCart()}
function getProduct(id){return products.find(p=>p.id===id)}
function cartLines(){return cart.map(x=>({product:getProduct(x.id),quantity:x.qty})).filter(x=>x.product && x.product.in_stock && x.product.active)}
function cartTotal(){return cartLines().reduce((n,x)=>n+x.product.price*x.quantity,0)}
function showToast(message){const e=$('#toast');e.textContent=message;e.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('show'),3600)}
function markPreview(){isDemo=true;catalogueStatus='offline';products=[];cart=[];saveCart();drawProducts();$('#demoBanner').hidden=false;$('#previewNotice').hidden=true}
function hidePreview(){isDemo=false;catalogueStatus='ready';$('#demoBanner').hidden=true;$('#previewNotice').hidden=true}
function updateContact(){const a=cfg.shopAddress?.trim();if(a)$('#shopLocation').textContent=a;const phone=String(cfg.shopPhone||'').replace(/\D/g,'');if(phone.length>=10&&phone.length<=15){$('#shopPhone').textContent=phone;$('#phoneLink').href=`tel:${phone}`}else{$('#phoneLink').hidden=true}const map=cfg.googleMapsUrl?.trim();if(/^https:\/\//i.test(map)){const el=$('#mapsLink');el.href=map;el.target='_blank';el.rel='noopener noreferrer';el.removeAttribute('aria-disabled');}else{$('#mapsLink').addEventListener('click',e=>{e.preventDefault();showToast('Shop location link will be available soon.')})}}
function whatsapp(message){const n=String(cfg.whatsappNumber || '').replace(/\D/g,'');if(n.length<10 || n.length>15){showToast('The shop WhatsApp number has not been added yet.');return}window.open(`https://wa.me/${n}?text=${encodeURIComponent(message)}`,'_blank','noopener,noreferrer')}
function photosFor(p){const urls=Array.isArray(p.image_urls)?p.image_urls:[];return [...new Set([...urls,p.image_url].filter(x=>typeof x==='string'&&(/^https:\/\//i.test(x)||/^\.\/assets\//.test(x))))].slice(0,8)}
function imageFor(p){return photosFor(p)[0]||'./frame-1.svg'}
function drawBrandFilters(){
  const wrap=$('#brandFilters');if(!wrap)return;
  // Keep owner-managed brands available, but only show them after the shopper asks to filter.
  const brands=[...new Map([...managedBrands,...products.filter(p=>p.active).map(p=>p.brand)].filter(b=>typeof b==='string'&&b.trim()).map(b=>[b.trim().toLowerCase(),b.trim()])).values()].sort((a,b)=>a.localeCompare(b));
  if(activeBrand!=='All'&&!brands.some(b=>b.toLowerCase()===activeBrand.toLowerCase()))activeBrand='All';
  const selected=activeBrand!=='All';
  wrap.innerHTML=`<details class="brand-select${selected?' has-selection':''}">
    <summary class="brand-select-toggle" aria-label="Filter by brand, ${selected?esc(activeBrand):'all brands'}">
      <svg class="brand-select-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M7 12h10M10 17h4"/></svg>
      <span class="brand-select-value">${selected?esc(activeBrand):'All brands'}</span>
      <svg class="brand-select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
    </summary>
    <div class="brand-select-menu" role="group" aria-label="Available brands">
      <div class="brand-select-title">FILTER BY BRAND</div>
      <button type="button" class="brand-choice${!selected?' active':''}" data-brand="All">All brands${!selected?'<span aria-hidden="true">✓</span>':''}</button>
      ${brands.map(b=>`<button type="button" class="brand-choice${selected&&activeBrand.toLowerCase()===b.toLowerCase()?' active':''}" data-brand="${esc(b)}">${esc(b)}${selected&&activeBrand.toLowerCase()===b.toLowerCase()?'<span aria-hidden="true">✓</span>':''}</button>`).join('')}
      ${brands.length?'':'<p class="brand-select-empty">Brands will appear when added.</p>'}
    </div>
  </details>`;
  wrap.querySelectorAll('[data-brand]').forEach(btn=>btn.addEventListener('click',()=>{
    activeBrand=btn.dataset.brand;
    drawProducts();
  }));
}
function openGallery(p){galleryPhotos=photosFor(p);if(!galleryPhotos.length)galleryPhotos=['./frame-1.svg'];galleryIndex=0;updateGallery();$('#gallery').hidden=false;document.body.classList.add('gallery-open')}
function updateGallery(){const el=$('#galleryImage');el.src=galleryPhotos[galleryIndex];el.alt='Frame photo '+(galleryIndex+1);$('#galleryCounter').textContent=(galleryIndex+1)+' / '+galleryPhotos.length;$('#galleryPrev').hidden=$('#galleryNext').hidden=galleryPhotos.length<2}
function stepGallery(n){galleryIndex=(galleryIndex+n+galleryPhotos.length)%galleryPhotos.length;updateGallery()}
function closeGallery(){$('#gallery').hidden=true;document.body.classList.remove('gallery-open')}
async function loadBrands(){if(!db)return;const {data,error}=await db.from('brands').select('name').order('name');if(error){console.warn('Brands unavailable:',error.message);return}managedBrands=(data||[]).map(x=>x.name);syncProductBrandOptions();drawProducts();renderAdminBrands()}
function syncProductBrandOptions(){
 const el=$('#brandSuggestions');if(!el)return;
 const names=[...new Map([...managedBrands,...products.map(p=>p.brand)].filter(x=>typeof x==='string'&&x.trim()).map(x=>[x.trim().toLowerCase(),x.trim()])).values()].sort((a,b)=>a.localeCompare(b));
 el.innerHTML=names.map(name=>'<option value="'+esc(name)+'"></option>').join('');
 const input=$('#productForm [name="brand"]');
 if(input)input.setAttribute('placeholder',names.length?'Choose or type a brand':'Enter brand name');
}
function renderAdminBrands(){const el=$('#adminBrandsList');if(!el)return;el.innerHTML=managedBrands.length?managedBrands.map(b=>'<div class="admin-product"><strong>'+esc(b)+'</strong><div class="admin-item-actions"><button type="button" data-remove-brand="'+esc(b)+'" class="danger">Remove</button></div></div>').join(''):'<p class="admin-info">No brands yet. Add one above.</p>';el.querySelectorAll('[data-remove-brand]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('Remove brand from brand list? Products with this brand remain unchanged.'))return;const {error}=await db.from('brands').delete().eq('name',b.dataset.removeBrand);if(error)showToast(error.message);else{await loadBrands();showToast('Brand removed')}}))}
async function addBrand(e){e.preventDefault();if(!owner||!db)return;const name=$('#newBrandName').value.trim();if(!name)return;const {error}=await db.from('brands').insert({name});if(error){showToast(error.message);return}$('#newBrandName').value='';await loadBrands();showToast('Brand added')}
function drawExistingPhotos(){const el=$('#existingPhotos');if(!el)return;el.innerHTML=editingPhotos.map((url,i)=>'<div class="existing-photo"><img src="'+esc(url)+'" alt="Photo '+(i+1)+'"><button type="button" data-remove-photo="'+i+'" aria-label="Remove photo">×</button></div>').join('');el.querySelectorAll('[data-remove-photo]').forEach(b=>b.addEventListener('click',()=>{editingPhotos.splice(Number(b.dataset.removePhoto),1);drawExistingPhotos()}));$('#photoHint').textContent=editingPhotos.length+' existing photo(s). You can keep up to 8 in total.'}
function drawProducts(){drawBrandFilters();const list=products.filter(p=>p.active && (activeCategory==='All'||p.category===activeCategory) && (activeBrand==='All'||String(p.brand||'').trim().toLocaleLowerCase()===activeBrand.toLocaleLowerCase()) && (!query || (p.name+' '+p.brand+' '+p.category+' '+p.description).toLowerCase().includes(query)));
$('#productsGrid').innerHTML=list.map(p=>`<article class="product-card"><div class="product-media"><img loading="lazy" src="${esc(imageFor(p))}" alt="${esc(p.name)}" class="gallery-trigger" data-gallery="${esc(p.id)}" tabindex="0" role="button" aria-label="View photos of ${esc(p.name)}"/>${p.featured?'<span class="product-badge">POPULAR PICK</span>':''}</div><div class="product-details"><div class="product-category">${p.brand?esc(p.brand):esc(p.category)}</div><h3>${esc(p.name)}</h3>${p.description?`<p class="product-frame-details">${esc(p.description)}</p>`:''}<div class="price-line"><span class="product-price">${rupees(p.price)}</span>${p.compare_at && p.compare_at>p.price?`<span class="compare-at">${rupees(p.compare_at)}</span>`:''}</div><button class="card-add card-add-below" type="button" data-add="${esc(p.id)}" ${p.in_stock?'':'disabled'} aria-label="Add ${esc(p.name)} to bag">${p.in_stock?'Add to bag ↗':'Out of stock'}</button></div></article>`).join('');
const empty=$('#emptyProducts');empty.hidden=list.length>0;
if(!list.length) empty.textContent=catalogueStatus==='loading'?'Loading our collection…':catalogueStatus==='offline'?'Our online catalogue is temporarily unavailable. Please call or WhatsApp Delux Opticals.':products.length===0?'Our collection is being updated. Please contact the shop for available frames.':'No matching frames found. Try another search, brand or category.';
$('#productCount').textContent=catalogueStatus==='ready'?`${list.length} styles available`:'';
$$('[data-add]').forEach(btn=>btn.addEventListener('click',()=>addToCart(btn.dataset.add)));$$('[data-gallery]').forEach(img=>{img.addEventListener('click',()=>{const p=getProduct(img.dataset.gallery);if(p)openGallery(p)});img.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();img.click()}})});
}
function addToCart(id){const p=getProduct(id);if(!p||!p.in_stock)return;const item=cart.find(x=>x.id===id);if(item){if(item.qty>=10){showToast('Maximum 10 of each frame per order.');return}item.qty++}else if(cart.length>=10){showToast('Maximum 10 different frames per order.');return}else cart.push({id,qty:1});saveCart();openPanel('cart');showToast(`${p.name} added to your bag`)}
function changeQty(id,diff){const el=cart.find(x=>x.id===id);if(!el)return;el.qty+=diff;if(el.qty<=0)cart=cart.filter(x=>x.id!==id);else el.qty=Math.min(10,el.qty);saveCart()}
function drawCart(){const lines=cartLines();const qty=lines.reduce((n,x)=>n+x.quantity,0);$('#cartCount').textContent=qty;$('#drawerCount').textContent=`(${qty})`;$('#subtotal').textContent=rupees(cartTotal());$('#checkoutSubtotal').textContent=rupees(cartTotal());$('#checkoutBtn').disabled=!qty;$('#whatsappCart').disabled=!qty;
$('#drawerItems').innerHTML=lines.length?lines.map(({product:p,quantity})=>`<div class="cart-row"><img src="${esc(imageFor(p))}" alt="${esc(p.name)}"><div class="cart-row-info"><strong>${esc(p.name)}</strong><span>${esc(p.category)}</span><div class="qty-controls"><button type="button" data-qty="-1" data-id="${esc(p.id)}" aria-label="Decrease quantity">−</button>${quantity}<button type="button" data-qty="1" data-id="${esc(p.id)}" aria-label="Increase quantity">+</button><button class="remove" type="button" data-remove="${esc(p.id)}">Remove</button></div></div><strong class="cart-row-price">${rupees(p.price*quantity)}</strong></div>`).join(''):'<div class="no-cart">Your bag is empty.<br>Explore our collection to get started.</div>';
$$('[data-qty]').forEach(btn=>btn.addEventListener('click',()=>changeQty(btn.dataset.id,Number(btn.dataset.qty))));$$('[data-remove]').forEach(btn=>btn.addEventListener('click',()=>{cart=cart.filter(x=>x.id!==btn.dataset.remove);saveCart()}));}
function openPanel(name){closePanels();activePanel=name;document.body.classList.add('locked');$('#overlay').hidden=false;const el=name==='cart'?$('#cartDrawer'):name==='checkout'?$('#checkoutModal'):$('#adminModal');el.classList.add('open');el.setAttribute('aria-hidden','false');if(name==='cart'){drawCart()} if(name==='checkout'){$('#orderResult').hidden=true;$('#checkoutForm').hidden=false;$('#checkoutSubtotal').textContent=rupees(cartTotal())}if(name==='admin')checkAdminSession()}
function closePanels(){activePanel='';document.body.classList.remove('locked');$('#overlay').hidden=true;[$('#cartDrawer'),$('#checkoutModal'),$('#adminModal')].forEach(e=>{e.classList.remove('open');e.setAttribute('aria-hidden','true')})}
function customerCartWhatsApp(){const lines=cartLines();if(!lines.length)return;const rows=lines.map(({product,quantity})=>`• ${product.name} × ${quantity} — ${rupees(product.price*quantity)}`).join('\n');whatsapp(`Hello Delux Opticals! I would like to enquire about these frames:\n${rows}\nFrames subtotal: ${rupees(cartTotal())}\nPlease confirm availability and lens price.`)}
async function submitOrder(event){event.preventDefault();if(!db){showToast('Online ordering is temporarily unavailable. Please contact the shop.');return}const lines=cartLines();if(!lines.length){showToast('Your bag is empty.');return}const form=$('#checkoutForm');if(!form.reportValidity())return;const fd=new FormData(form);const method=fd.get('fulfilment');const name=String(fd.get('name')||'').trim();const phone=String(fd.get('phone')||'').trim();const address=String(fd.get('address')||'').trim();const note=String(fd.get('note')||'').trim();if(!/^[6-9][0-9]{9}$/.test(phone)){showToast('Please enter a valid 10-digit mobile number.');return}if(method==='delivery'&&address.length<10){showToast('Please enter a complete delivery address.');return}const btn=$('#placeOrderBtn');btn.disabled=true;btn.textContent='Sending request…';try{const {data,error}=await db.rpc('place_order',{p_customer_name:name,p_phone:phone,p_fulfillment:method,p_address:address,p_note:note,p_items:lines.map(x=>({product_id:x.product.id,quantity:x.quantity}))});if(error)throw error;cart=[];saveCart();form.reset();$('#checkoutForm').hidden=true;$('#orderResult').hidden=false;$('#orderResult').innerHTML=`<div class="check-big">✓</div><strong>Request received!</strong><p>Reference: <b>${esc(data.code)}</b></p><p>Delux Opticals will contact you to confirm the frame, lens requirements and final payable amount.</p><button type="button" class="button button-dark full" id="resultClose">Continue browsing</button>`;$('#resultClose').addEventListener('click',closePanels)}catch(e){showToast(e.message || 'Could not place order. Please try WhatsApp instead.')}finally{btn.disabled=false;btn.textContent='Place order request →'}}
async function initializeBackend(){
  if(!cfg.supabaseUrl||!cfg.supabaseAnonKey){markPreview();return}
  try{
    const sdk=await import('https://esm.sh/@supabase/supabase-js@2.76.1');
    db=sdk.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:false}});
  }catch(e){console.error('Supabase SDK initialization failed:',e);markPreview();return}
  // Catalogue failures must not disable Supabase Auth for the owner portal.
  try{
    const {data,error}=await db.from('products').select('id,name,brand,category,description,price,compare_at,image_url,image_urls,active,in_stock,featured').eq('active',true).order('created_at',{ascending:false});
    if(error)throw error;
    hidePreview();products=data||[];cart=cart.filter(x=>!!getProduct(x.id));saveCart();drawProducts();
  }catch(e){console.error('Catalogue load failed:',e);markPreview();showToast('Catalogue temporarily unavailable. Owner login remains accessible.')}
  // Owner login is available as soon as the Supabase client is created.
  loadBrands().catch(e=>console.warn('Brand list could not load:',e));
}
async function checkAdminSession(){await backendReady;if(!db){showLogin();$('#adminLoginMessage').textContent='Owner login is temporarily unavailable. Please try again later.';return}try{const {data:{user},error:userError}=await db.auth.getUser();if(userError)throw userError;if(!user){owner=false;showLogin();return}const {data,error}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();if(error||!data){owner=false;showLogin();$('#adminLoginMessage').textContent='This account is not approved as a shop admin.';return}owner=true;$('#adminLogin').hidden=true;$('#adminForgot').hidden=true;$('#adminDashboard').hidden=false;$('#adminModal').classList.add('owner-is-dashboard');await Promise.all([loadAdminProducts(),loadAdminOrders(),loadBrands()])}catch(e){owner=false;showLogin();$('#adminLoginMessage').textContent='Unable to verify this account right now. Please try again.'}}
function showLogin(){$('#adminLogin').hidden=false;$('#adminForgot').hidden=true;$('#adminDashboard').hidden=true;$('#adminModal').classList.remove('owner-is-dashboard');$('#adminForgotMessage').textContent=''}
function showForgot(){$('#adminLogin').hidden=true;$('#adminForgot').hidden=false;$('#adminDashboard').hidden=true;$('#adminModal').classList.remove('owner-is-dashboard');$('#adminForgotMessage').textContent='';$('#ownerRecoveryEmail').value=$('#ownerEmail').value.trim();$('#ownerRecoveryEmail').focus()}
async function requestPasswordReset(e){e.preventDefault();const form=e.currentTarget;const email=String(new FormData(form).get('email')||'').trim().toLowerCase();const btn=form.querySelector('[type=submit]');const notice=$('#adminForgotMessage');notice.textContent='';notice.dataset.tone='';if(!db){notice.dataset.tone='error';notice.textContent='Email recovery is temporarily unavailable. Please contact the website administrator.';return}btn.disabled=true;btn.textContent='Sending request…';try{const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:'https://www.deluxopticals.in/reset-password.html'});if(error)throw error;notice.dataset.tone='success';notice.textContent='If this is a registered owner email, check your inbox and spam folder for a password reset link.'}catch(err){notice.dataset.tone='error';notice.textContent=/not authorized|smtp|email address not authorized/i.test(err.message||'')?'Email delivery needs to be enabled for this account. Please contact the website administrator.':(err.message||'Could not request a reset link. Please try again later.')}finally{btn.disabled=false;btn.innerHTML='Send reset link <span aria-hidden="true">→</span>'}}
function toggleOwnerPassword(){const input=$('#ownerPassword');const btn=$('#ownerTogglePassword');const visible=input.type==='password';input.type=visible?'text':'password';btn.textContent=visible?'Hide':'Show';btn.setAttribute('aria-label',visible?'Hide password':'Show password');btn.setAttribute('aria-pressed',String(visible))}
async function loginAdmin(e){e.preventDefault();await backendReady;if(!db){$('#adminLoginMessage').textContent='Connection unavailable. Please reload this page and try again.';return}const fd=new FormData(e.currentTarget);const button=e.currentTarget.querySelector('button[type=submit]');$('#adminLoginMessage').textContent='';button.disabled=true;try{const {error}=await db.auth.signInWithPassword({email:String(fd.get('email')).trim(),password:String(fd.get('password'))});if(error)throw error;await checkAdminSession()}catch(err){$('#adminLoginMessage').textContent='Unable to sign in. Check your email and password, then try again.'}finally{button.disabled=false}}
async function loadAdminProducts(){if(!db||!owner)return;const {data,error}=await db.from('products').select('*').order('created_at',{ascending:false});if(error){showToast(error.message);return}const el=$('#adminProductsList');el.innerHTML=data.length?data.map(p=>`<div class="admin-product"><img src="${esc(imageFor(p))}" alt=""><div class="admin-product-info"><strong>${esc(p.name)}</strong><small>${esc(p.category)}${p.brand?' • '+esc(p.brand):''} • ${rupees(p.price)} • ${p.active?'Visible':'Hidden'} • ${p.in_stock?'In stock':'Out of stock'}</small></div><div class="admin-item-actions"><button type="button" data-edit="${esc(p.id)}">Edit</button><button type="button" class="danger" data-delete="${esc(p.id)}">Delete</button></div></div>`).join(''):'<p class="admin-info">No products yet. Add your first frame above.</p>';
$$('[data-edit]').forEach(b=>b.addEventListener('click',()=>{const p=data.find(x=>x.id===b.dataset.edit);if(p)fillProductForm(p)}));$$('[data-delete]').forEach(b=>b.addEventListener('click',()=>deleteProduct(b.dataset.delete)))}
function fillProductForm(p){const f=$('#productForm');f.hidden=false;f.elements.id.value=p?.id||'';f.elements.name.value=p?.name||'';f.elements.category.value=p?.category||'Men';f.elements.brand.value=p?.brand||'';f.elements.price.value=p?.price||'';f.elements.compare_at.value=p?.compare_at||'';f.elements.description.value=p?.description||'';f.elements.active.checked=p?.active??true;f.elements.in_stock.checked=p?.in_stock??true;f.elements.featured.checked=p?.featured??false;f.elements.photo.value='';editingPhotos=p?photosFor(p):[];drawExistingPhotos();f.scrollIntoView({behavior:'smooth',block:'nearest'})}
// Keep Supabase's current 2 MB per-object bucket limit while accepting bigger phone photos.
// All processing happens on the owner's device; only the optimized image is uploaded.
const MAX_INPUT_PHOTO_BYTES = 15 * 1024 * 1024;
const MAX_STORED_PHOTO_BYTES = 1800 * 1024; // safely below bucket's 2 MiB restriction
const VALID_PHOTO_TYPES = ['image/jpeg','image/png','image/webp'];
function decodeUploadImage(file){
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file);
    const img=new Image();
    img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Could not read this photo. Choose a JPG, PNG or WEBP image.'))};
    img.src=url;
  });
}
function exportUploadJpeg(canvas,quality){
  return new Promise((resolve,reject)=>{
    canvas.toBlob(blob=>{
      if(!blob||blob.type!=='image/jpeg')reject(new Error('This browser could not optimize the image. Try another JPG photo.'));
      else resolve(blob);
    },'image/jpeg',quality);
  });
}
async function prepareUploadPhoto(file){
  if(!VALID_PHOTO_TYPES.includes(file.type))throw new Error('Please select JPG, PNG or WEBP photos.');
  if(file.size>MAX_INPUT_PHOTO_BYTES)throw new Error('Each original photo must be 15 MB or smaller.');
  if(file.size<=MAX_STORED_PHOTO_BYTES)return file; // preserve original if already small enough
  const img=await decodeUploadImage(file);
  if(!img.naturalWidth||!img.naturalHeight)throw new Error('The photo has invalid dimensions.');
  let scale=Math.min(1,2400/Math.max(img.naturalWidth,img.naturalHeight));
  let width=Math.max(1,Math.round(img.naturalWidth*scale));
  let height=Math.max(1,Math.round(img.naturalHeight*scale));
  const canvas=document.createElement('canvas');
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('This device cannot optimize photos. Try a smaller image.');
  // Use white background so transparent PNG frames remain readable after JPEG conversion.
  for(let attempt=0;attempt<5;attempt++){
    canvas.width=width;canvas.height=height;
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);
    ctx.drawImage(img,0,0,width,height);
    for(const quality of [0.9,0.82,0.74,0.66]){
      const output=await exportUploadJpeg(canvas,quality);
      if(output.size<=MAX_STORED_PHOTO_BYTES){
        canvas.width=0;canvas.height=0;
        return output;
      }
    }
    width=Math.max(1,Math.round(width*0.8));
    height=Math.max(1,Math.round(height*0.8));
  }
  canvas.width=0;canvas.height=0;
  throw new Error('This image is too detailed to optimize. Please try a smaller photo.');
}
async function saveProduct(e){e.preventDefault();if(!db||!owner)return;const f=e.currentTarget;const button=f.querySelector('button[type=submit]');button.disabled=true;try{const fd=new FormData(f);const id=String(fd.get('id')||'');const files=[...f.elements.photo.files];const updates={name:String(fd.get('name')||'').trim(),category:String(fd.get('category')),brand:String(fd.get('brand')||'').trim().slice(0,60),price:Number(fd.get('price')),compare_at:fd.get('compare_at')?Number(fd.get('compare_at')):null,description:String(fd.get('description')||'').trim(),active:fd.get('active')==='on',in_stock:fd.get('in_stock')==='on',featured:fd.get('featured')==='on',updated_at:new Date().toISOString()};if(updates.name.length<2||updates.price<1||updates.price>200000)throw new Error('Enter a valid name and price');if(updates.compare_at!==null&&updates.compare_at<updates.price)throw new Error('MRP should be at least the sale price');if(files.length+editingPhotos.length>8)throw new Error('Maximum 8 photos per frame');const urls=[...editingPhotos];const hint=$('#photoHint');const defaultHint=hint?.textContent||'';for(const [index,file] of files.entries()){if(hint)hint.textContent=`Preparing and uploading photo ${index+1} of ${files.length}…`;const optimized=await prepareUploadPhoto(file);const path=`frames/${Date.now()}-${crypto.randomUUID()}.${optimized.type==='image/png'?'png':optimized.type==='image/webp'?'webp':'jpg'}`;const {error}=await db.storage.from('deluxe-products').upload(path,optimized,{upsert:false,contentType:optimized.type});if(error)throw error;urls.push(db.storage.from('deluxe-products').getPublicUrl(path).data.publicUrl)}if(hint)hint.textContent=defaultHint;updates.image_urls=urls;updates.image_url=urls[0]||null;let result;if(id)result=await db.from('products').update(updates).eq('id',id).select('id').single();else result=await db.from('products').insert(updates).select('id').single();if(result.error)throw result.error;f.reset();f.hidden=true;editingPhotos=[];await Promise.all([refreshPublicProducts(),loadAdminProducts()]);if(updates.brand&&!managedBrands.some(x=>x.toLowerCase()===updates.brand.toLowerCase())){const {error:brandError}=await db.from('brands').insert({name:updates.brand});if(!brandError)await loadBrands()}showToast(id?'Product updated':'Product added')}catch(err){showToast(err.message||'Could not save product')}finally{button.disabled=false;const hint=$('#photoHint');if(hint)hint.textContent='Select up to 8 photos. Images up to 15 MB each are optimized automatically before upload.'}}
async function deleteProduct(id){if(!db||!owner||!confirm('Delete this product? Existing order records will keep the product name.'))return;const {error}=await db.from('products').delete().eq('id',id);if(error){showToast(error.message);return}await Promise.all([refreshPublicProducts(),loadAdminProducts()]);showToast('Product deleted')}
async function refreshPublicProducts(){if(!db)return;const {data,error}=await db.from('products').select('id,name,brand,category,description,price,compare_at,image_url,image_urls,active,in_stock,featured').eq('active',true).order('created_at',{ascending:false});if(error){showToast(error.message);return}products=data||[];cart=cart.filter(x=>getProduct(x.id));saveCart();drawProducts()}
async function loadAdminOrders(){if(!db||!owner)return;const {data,error}=await db.from('orders').select('id,public_code,customer_name,phone,fulfillment,address,customer_note,subtotal,status,created_at,order_items(product_name,quantity,unit_price,line_total)').order('created_at',{ascending:false}).limit(100);if(error){showToast(error.message);return}lastOrders=data||[];$('#adminOrdersList').innerHTML=lastOrders.length?lastOrders.map(o=>`<div class="admin-order"><div class="admin-order-info"><strong>${esc(o.public_code)} — ${esc(o.customer_name)}</strong><small>${esc(o.phone)} • ${esc(o.fulfillment)} • ${rupees(o.subtotal)} • ${new Date(o.created_at).toLocaleString('en-IN')}</small>${o.address?`<small><br>Address: ${esc(o.address)}</small>`:''}${o.customer_note?`<small><br>Note: ${esc(o.customer_note)}</small>`:''}<div class="admin-order-items">${(o.order_items||[]).map(i=>`${esc(i.product_name)} × ${i.quantity}`).join(' · ')}</div></div><select data-status="${esc(o.id)}" aria-label="Order ${esc(o.public_code)} status">${['Pending','Confirmed','Ready','Completed','Cancelled'].map(s=>`<option ${s===o.status?'selected':''}>${s}</option>`).join('')}</select></div>`).join(''):'<p class="admin-info">No customer orders yet.</p>';
$$('[data-status]').forEach(s=>s.addEventListener('change',async()=>{const {error}=await db.from('orders').update({status:s.value}).eq('id',s.dataset.status);if(error){showToast(error.message);await loadAdminOrders()}else showToast('Order status updated')}))}
function setupEvents(){document.getElementById('year').textContent=new Date().getFullYear();
document.addEventListener('pointerdown',e=>{const menu=$('#brandFilters .brand-select');if(menu?.open&&!menu.contains(e.target))menu.open=false});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const menu=$('#brandFilters .brand-select');if(menu?.open){menu.open=false;menu.querySelector('summary')?.focus()}}});$('#cartTop').addEventListener('click',()=>openPanel('cart'));$('#adminOpen').addEventListener('click',()=>openPanel('admin'));$('#overlay').addEventListener('click',closePanels);$$('.close-panels').forEach(b=>b.addEventListener('click',closePanels));document.addEventListener('keydown',e=>{if(e.key==='Escape')closePanels()});
$$('.filter').forEach(b=>b.addEventListener('click',()=>{activeCategory=b.dataset.category;activeBrand='All';$$('.filter').forEach(x=>x.classList.toggle('active',activeCategory===x.dataset.category));drawProducts()}));$('#productSearch').addEventListener('input',e=>{query=e.target.value.trim().toLowerCase();drawProducts()});$('#checkoutBtn').addEventListener('click',()=>{if(!cartLines().length)return;openPanel('checkout')});$('#whatsappCart').addEventListener('click',customerCartWhatsApp);$('#whatsappVisit').addEventListener('click',()=>whatsapp('Hello Delux Opticals! I would like to enquire about your latest frames.'));$('#checkoutForm').addEventListener('submit',submitOrder);
$$('input[name=fulfilment]').forEach(r=>r.addEventListener('change',()=>{const delivery=$('input[name=fulfilment]:checked').value==='delivery';$('#addressField').hidden=!delivery;$('#addressField textarea').required=delivery}));
$('#adminLoginForm').addEventListener('submit',loginAdmin);$('#ownerForgotLink').addEventListener('click',showForgot);$('#ownerBackToLogin').addEventListener('click',()=>{showLogin();$('#ownerEmail').focus()});$('#adminForgotForm').addEventListener('submit',requestPasswordReset);$('#ownerTogglePassword').addEventListener('click',toggleOwnerPassword);$('#adminLogout').addEventListener('click',async()=>{if(db)await db.auth.signOut();owner=false;showLogin()});$('#addProductToggle').addEventListener('click',()=>{if($('#productForm').hidden)fillProductForm(null);else $('#productForm').hidden=true});$('#cancelProduct').addEventListener('click',()=>$('#productForm').hidden=true);$('#productForm').addEventListener('submit',saveProduct);$('#refreshOrders').addEventListener('click',loadAdminOrders);$('#brandForm').addEventListener('submit',addBrand);$('#galleryClose').addEventListener('click',closeGallery);$('#galleryPrev').addEventListener('click',()=>stepGallery(-1));$('#galleryNext').addEventListener('click',()=>stepGallery(1));let touchX=0;$('#gallery').addEventListener('touchstart',e=>{touchX=e.changedTouches[0].screenX},{passive:true});$('#gallery').addEventListener('touchend',e=>{const d=e.changedTouches[0].screenX-touchX;if(Math.abs(d)>45)stepGallery(d<0?1:-1)},{passive:true});document.addEventListener('keydown',e=>{if($('#gallery').hidden)return;if(e.key==='Escape')closeGallery();if(e.key==='ArrowLeft')stepGallery(-1);if(e.key==='ArrowRight')stepGallery(1)});
$$('[data-admin-tab]').forEach(b=>b.addEventListener('click',()=>{$$('[data-admin-tab]').forEach(x=>x.classList.toggle('active',x===b));$('#adminProductsTab').hidden=b.dataset.adminTab!=='products';$('#adminOrdersTab').hidden=b.dataset.adminTab!=='orders';$('#adminBrandsTab').hidden=b.dataset.adminTab!=='brands';if(b.dataset.adminTab==='brands')loadBrands();if(b.dataset.adminTab==='orders')loadAdminOrders()}));
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;$('#installTop').hidden=false});$('#installTop').addEventListener('click',async()=>{if(!installEvent){showToast('Use your browser menu → Add to Home Screen');return}await installEvent.prompt();installEvent=null;$('#installTop').hidden=true});window.addEventListener('appinstalled',()=>{$('#installTop').hidden=true;showToast('Delux Opticals added to your home screen!')});
}
setupEvents();updateContact();drawProducts();drawCart();const backendReady=initializeBackend();if(new URLSearchParams(location.search).get('owner-login')==='1'){openPanel('admin');history.replaceState(null,'',location.pathname+location.hash)}

})();
