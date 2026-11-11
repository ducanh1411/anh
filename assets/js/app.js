(async function(){
"use strict";
const $=id=>document.getElementById(id);
let CONFIG, materials=[], page=1, pageSize=8, selectedMaterial=null, currentBarcode="";
let formState={categoryId:"THEP",subtypeId:"STEEL_PLATE",materialType:"ROH",attributes:{}};
const categoryName=id=>(CONFIG.categories.find(x=>x.id===id)||{}).name||id||"—";
const subtype=()=>MaterialRules.subtypeFor(CONFIG,formState.categoryId,formState.subtypeId);
const escapeHtml=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(message,type=""){const el=document.createElement("div");el.className=`toast ${type}`;el.textContent=message;$("toastRegion").append(el);setTimeout(()=>el.remove(),3800);}
function localDemo(){return materials.length>0;}
function setConnection(state,label){const el=$("connection");el.className=`connection ${state}`;el.querySelector("span").textContent=label;}
function loadDemo(){return [
{id:"d1",code:"DEMO-001",name:"Thép tấm SS400 · 20x2000x6000 mm",categoryId:"THEP",subtypeId:"STEEL_PLATE",unit:"Tấm",materialType:"ROH",grade:"SS400",status:"ACTIVE",codeOrigin:"MANUAL_LEGACY",createdAt:new Date(Date.now()-86400000*2).toISOString(),attributesJson:{grade:"SS400",thickness:"20",width:"2000",length:"6000"}},
{id:"d2",code:"DEMO-002",name:"Thép tròn đặc S45C · Ø80x270 mm",categoryId:"THEP",subtypeId:"STEEL_ROUND",unit:"Thanh",materialType:"ROH",grade:"S45C",status:"ACTIVE",codeOrigin:"MANUAL_LEGACY",createdAt:new Date(Date.now()-86400000*4).toISOString(),attributesJson:{grade:"S45C",diameter:"80",length:"270"}},
{id:"d3",code:"DEMO-003",name:"Cao su tấm EPDM · 60 Shore A · 5x400x1200 mm",categoryId:"CAO_SU",subtypeId:"RUBBER_SHEET",unit:"Tấm",materialType:"ROH",status:"ACTIVE",codeOrigin:"MANUAL_LEGACY",createdAt:new Date(Date.now()-86400000*6).toISOString(),attributesJson:{compound:"EPDM",hardness:"60",thickness:"5",width:"400",length:"1200"}},
{id:"d4",code:"DEMO-004",name:"Tấm trượt PTFE · 7x350x350 mm · Trơn",categoryId:"TAM_TRUOT",subtypeId:"SLIDE_PLATE",unit:"Tấm",materialType:"ROH",status:"ACTIVE",codeOrigin:"MANUAL_LEGACY",createdAt:new Date(Date.now()-86400000*8).toISOString(),attributesJson:{compound:"PTFE",thickness:"7",width:"350",length:"350",surface:"Trơn"}},
{id:"d5",code:"DEMO-005",name:"Bu lông lục giác ngoài DIN 933 · 8.8 · M20x80 · Không mạ",categoryId:"BU_LONG",subtypeId:"HEX_BOLT",unit:"Cái",materialType:"HIBE",status:"ACTIVE",codeOrigin:"MANUAL_LEGACY",createdAt:new Date(Date.now()-86400000*10).toISOString(),attributesJson:{standard:"DIN 933",strength:"8.8",diameter:"20",length:"80",finish:"Không mạ"}}
];}
function date(v){if(!v)return"—";const d=new Date(v);return Number.isNaN(d.getTime())?"—":d.toLocaleDateString("vi-VN");}
function rowHtml(m){return `<tr data-code="${escapeHtml(m.code)}"><td><span class="code-text">${escapeHtml(m.code)}</span></td><td><span class="material-name">${escapeHtml(m.name)}</span></td><td>${escapeHtml(categoryName(m.categoryId))}</td><td>${escapeHtml(m.unit||"—")}</td><td>${m.codeOrigin==="SYSTEM_GENERATED"?"Hệ thống":"Dữ liệu mẫu"}</td><td><span class="status-pill">${m.status==="INACTIVE"?"Ngừng sử dụng":"Đang sử dụng"}</span></td></tr>`;}
function renderDashboard(){
 $("statTotal").textContent=materials.length;
 $("statGroups").textContent=CONFIG.categories.length;
 $("statRecent").textContent=materials.filter(m=>Date.now()-new Date(m.createdAt||0).getTime()<7*86400000).length;
 $("statState").textContent=CloudBridge.configured?"Đã kết nối":"Demo";
 $("statStateHint").textContent=CloudBridge.configured?"Google Sheets / GAS":"Chưa kết nối Google Sheets";
 const counts=CONFIG.categories.map(c=>({name:c.name,count:materials.filter(m=>m.categoryId===c.id).length}));
 const max=Math.max(1,...counts.map(x=>x.count));
 $("groupBars").innerHTML=counts.map((x,i)=>`<div class="bar-row"><span>${escapeHtml(x.name)}</span><div class="bar-track"><div class="bar-fill" style="width:${x.count/max*100}%"></div></div><b class="bar-value">${x.count}</b></div>`).join("");
 const recent=[...materials].sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0)).slice(0,5);
 $("recentRows").innerHTML=recent.length?recent.map(m=>`<tr data-code="${escapeHtml(m.code)}"><td><span class="code-text">${escapeHtml(m.code)}</span></td><td><span class="material-name">${escapeHtml(m.name)}</span></td><td>${escapeHtml(categoryName(m.categoryId))}</td><td>${date(m.createdAt)}</td><td><span class="status-pill">${m.status==="INACTIVE"?"Ngừng sử dụng":"Đang sử dụng"}</span></td></tr>`).join(""):`<tr><td colspan="5" class="empty-row">Chưa có dữ liệu vật tư.</td></tr>`;
}
function renderCatalog(){
 const q=$("searchInput").value.trim().toLowerCase(),g=$("groupFilter").value,s=$("statusFilter").value;
 const filtered=materials.filter(m=>(!q||`${m.code} ${m.name}`.toLowerCase().includes(q))&&(!g||m.categoryId===g)&&(!s||m.status===s));
 const pages=Math.max(1,Math.ceil(filtered.length/pageSize));page=Math.min(page,pages);
 const shown=filtered.slice((page-1)*pageSize,page*pageSize);
 $("catalogRows").innerHTML=shown.length?shown.map(rowHtml).join(""):`<tr><td colspan="6" class="empty-row">Không tìm thấy vật tư phù hợp.</td></tr>`;
 $("catalogCount").textContent=`${filtered.length} vật tư`;
 $("pageInfo").textContent=`Trang ${page}/${pages}`;
 $("prevPage").disabled=page<=1;$("nextPage").disabled=page>=pages;
}
function initSelectors(){
 $("groupFilter").innerHTML='<option value="">Tất cả nhóm vật tư</option>'+CONFIG.categories.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
 $("categorySelect").innerHTML=CONFIG.categories.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
 $("materialTypeSelect").innerHTML=CONFIG.materialTypes.map(t=>`<option value="${t.id}">${escapeHtml(t.name)}</option>`).join("");
 updateSubtypes();
}
function updateSubtypes(){
 const list=CONFIG.formSchemas[formState.categoryId]||[];
 $("subtypeSelect").innerHTML=list.map(s=>`<option value="${s.id}">${escapeHtml(s.label)}</option>`).join("");
 formState.subtypeId=list[0]?.id||"";
 const s=subtype();if(s){formState.materialType=s.defaultMaterialType;$("materialTypeSelect").value=s.defaultMaterialType;}
 renderFields();updatePreview();
}
function renderFields(){
 const s=subtype();if(!s){$("dynamicFields").innerHTML="";return;}
 $("dynamicFields").innerHTML=s.fields.map(f=>{
   const id=`field-${f.id}`,value=formState.attributes[f.id]??"";
   let control="";
   if(f.kind==="select") control=`<select id="${id}" data-field="${f.id}"><option value="">-- Chọn ${escapeHtml(f.label.toLowerCase())} --</option>${f.options.map(o=>`<option ${o===value?"selected":""} value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join("")}</select>`;
   else if(f.kind==="suggest") control=`<input id="${id}" data-field="${f.id}" list="list-${f.id}" value="${escapeHtml(value)}" placeholder="Nhập hoặc chọn gợi ý"><datalist id="list-${f.id}">${f.options.map(o=>`<option value="${escapeHtml(o)}">`).join("")}</datalist>`;
   else if(f.kind==="number") control=`<div class="unit-wrap"><input id="${id}" data-field="${f.id}" type="number" min="0.001" step="0.001" value="${escapeHtml(value)}" placeholder="Nhập số"><small>${escapeHtml(f.unit||"")}</small></div>`;
   else control=`<input id="${id}" data-field="${f.id}" type="text" value="${escapeHtml(value)}" placeholder="${escapeHtml(f.hint||"Nhập "+f.label.toLowerCase())}">`;
   return `<label class="field"><span>${escapeHtml(f.label)} ${f.required?'<em>*</em>':""}</span>${control}</label>`;
 }).join("");
 $("schemaHint").textContent=s.hint||"Các thuộc tính có dấu * là bắt buộc. Thuộc tính nhận dạng được dùng để kiểm tra trùng lặp.";
 $("dynamicFields").querySelectorAll("[data-field]").forEach(el=>el.addEventListener("input",onFieldChange));
 $("dynamicFields").querySelectorAll("select[data-field]").forEach(el=>el.addEventListener("change",onFieldChange));
}
function onFieldChange(e){formState.attributes[e.target.dataset.field]=e.target.value;updatePreview();}
function formValid(){return MaterialRules.validate(CONFIG,formState.categoryId,formState.subtypeId,formState.attributes).ok;}
function updatePreview(){
 const s=subtype(),a=formState.attributes,validation=MaterialRules.validate(CONFIG,formState.categoryId,formState.subtypeId,a);
 const name=MaterialRules.buildName(CONFIG,formState.categoryId,formState.subtypeId,a);
 $("namePreview").textContent=name||"Chưa đủ thông tin";
 $("previewCategory").textContent=categoryName(formState.categoryId);
 $("previewSubtype").textContent=s?.label||"—";$("previewUnit").textContent=s?.unit||"—";
 const result=MaterialRules.compare(CONFIG,formState.categoryId,formState.subtypeId,a,materials);
 const el=$("duplicateStatus"),list=$("duplicateList");
 if(!validation.ok){el.className="duplicate-state neutral";el.innerHTML=`<span class="state-icon">!</span><div><b>Chưa đủ điều kiện kiểm tra</b><small>${escapeHtml(validation.message)}</small></div>`;list.innerHTML="";$("createBtn").disabled=true;$("createBtn").textContent="Hoàn thiện thông tin";return;}
 if(result.state==="exact"){el.className="duplicate-state exact";el.innerHTML='<span class="state-icon">!</span><div><b>Vật tư đã tồn tại trong danh mục Material Master</b><small>Hệ thống phát hiện bản ghi có thuộc tính nhận dạng trùng khớp. Không thể cấp mã mới.</small></div>';}
 else if(result.state==="similar"){el.className="duplicate-state similar";el.innerHTML='<span class="state-icon">?</span><div><b>Gần giống / Cần kiểm tra</b><small>Có bản ghi liên quan. Hãy đối chiếu thông số trước khi gửi yêu cầu.</small></div>';}
 else if(result.state==="clear"){el.className="duplicate-state clear";el.innerHTML='<span class="state-icon">✓</span><div><b>Không phát hiện trùng trong dữ liệu đã tải</b><small>GAS vẫn phải kiểm tra lại trên dữ liệu mới nhất.</small></div>';}
 else {el.className="duplicate-state neutral";el.innerHTML='<span class="state-icon">…</span><div><b>Đang đối chiếu</b><small>Nhập đủ thuộc tính nhận dạng để kiểm tra.</small></div>';}
 list.innerHTML=result.matches.map(x=>`<div class="duplicate-item" data-code="${escapeHtml(x.material.code)}"><b>${escapeHtml(x.material.code)} · ${escapeHtml(x.material.name)}</b><small>${escapeHtml(x.reason)}</small></div>`).join("");
 const blocked=result.state==="exact"||!validation.ok;
 $("createBtn").disabled=blocked;$("createBtn").textContent=blocked?"Không thể cấp mã":result.state==="similar"?"Đã xem cảnh báo – Gửi kiểm tra server":"Gửi yêu cầu cấp mã";
}
function resetForm(){
 formState={categoryId:"THEP",subtypeId:"STEEL_PLATE",materialType:"ROH",attributes:{}};
 $("categorySelect").value="THEP";$("actorName").value="";$("notes").value="";updateSubtypes();updatePreview();
}
function showPage(name){
 document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===`page-${name}`));
 document.querySelectorAll(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.page===name));
 $("sidebar").classList.remove("open");if(name==="catalog")renderCatalog();
}
function showDetail(m){
 selectedMaterial=m;let attrs={};try{attrs=typeof m.attributesJson==="string"?JSON.parse(m.attributesJson):(m.attributesJson||{});}catch(e){}
 const s=MaterialRules.subtypeFor(CONFIG,m.categoryId,m.subtypeId);
 const fields=s?.fields||[];
 $("detailContent").innerHTML=`<div class="detail-hero"><small>${escapeHtml(m.code)}</small><h3>${escapeHtml(m.name)}</h3><span class="status-pill">${m.status==="INACTIVE"?"Ngừng sử dụng":"Đang sử dụng"}</span></div><div class="detail-grid">${[
 ["Nhóm vật tư",categoryName(m.categoryId)],["Chủng loại",s?.label||m.subtypeId||"—"],["Đơn vị tính",m.unit||"—"],["Loại vật tư",m.materialType||"—"],["Nguồn mã",m.codeOrigin||"—"],["Ngày tạo",date(m.createdAt)],...fields.map(f=>[f.label,attrs[f.id]?(attrs[f.id]+(f.unit?` ${f.unit}`:"")):"—"]),["Ghi chú",m.notes||"—"]
 ].map(([k,v])=>`<div class="detail-line"><span>${escapeHtml(k)}</span><b>${escapeHtml(v)}</b></div>`).join("")}</div>`;
 $("detailModal").classList.add("open");
}
function openBarcode(m){
 currentBarcode=m.code;
 let markup;try{markup=Code128.svg(m.code);}catch(e){toast(e.message,"error");return;}
 $("barcodeContent").innerHTML=`<div class="barcode-label"><h3>${escapeHtml(m.name)}</h3><p>${escapeHtml(categoryName(m.categoryId))} · ${escapeHtml(m.unit||"")}</p>${markup}<div class="barcode-number">${escapeHtml(m.code)}</div></div>`;
 $("barcodeModal").classList.add("open");
}
function downloadSvg(){
 const svg=Code128.svg(currentBarcode),blob=new Blob([svg],{type:"image/svg+xml"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=`${currentBarcode}-barcode.svg`;a.click();URL.revokeObjectURL(url);
}
function printBarcode(){
 const html=$("barcodeContent").innerHTML,win=window.open("","_blank","width=600,height=450");
 if(!win){toast("Trình duyệt đang chặn cửa sổ in. Hãy cho phép popup.","error");return;}
 win.document.write(`<html><head><title>In nhãn ${escapeHtml(currentBarcode)}</title><style>body{font-family:Arial;padding:30px}.barcode-label{text-align:center;border:1px solid #ddd;padding:25px}h3{font-size:14px}p{font-size:11px}svg{max-width:100%;height:auto}.barcode-number{font-weight:bold;letter-spacing:2px;margin-top:8px}</style></head><body>${html}</body></html>`);
 win.document.close();win.focus();setTimeout(()=>win.print(),300);
}
async function syncData(silent=false){
 if(!CloudBridge.configured){setConnection("","Demo cục bộ");if(!silent)toast("Chưa cấu hình GAS. Đang sử dụng dữ liệu demo cục bộ.");return;}
 setConnection("","Đang đồng bộ...");
 try{
   const status=await CloudBridge.call("training.status",{});
   if(status.enabled!==true||status.attributeSchemaVersion!=="erp-attribute-v1"){
     setConnection("error","Backend chưa sẵn sàng");$("createBtn").disabled=true;
     toast("Backend chưa bật chế độ đào tạo hoặc schema không tương thích.","error");return;
   }
   const data=await CloudBridge.call("training.list",{});
   materials=Array.isArray(data.materials)?data.materials:[];
   setConnection("connected","Đã kết nối Google Sheets");
   renderDashboard();renderCatalog();updatePreview();
   if(!silent)toast(`Đồng bộ thành công ${materials.length} vật tư.`,"success");
 }catch(e){setConnection("error","Lỗi kết nối GAS");if(!silent)toast(e.message,"error");}
}
function makeRequestId(){return crypto.randomUUID?crypto.randomUUID():`req-${Date.now()}-${Math.random().toString(16).slice(2)}`;}
async function createMaterial(){
 if(!CloudBridge.configured){toast("Đang ở Demo cục bộ. Hãy cấu hình GAS /exec để cấp mã chính thức.","error");return;}
 const validation=MaterialRules.validate(CONFIG,formState.categoryId,formState.subtypeId,formState.attributes);
 if(!validation.ok){toast(validation.message,"error");return;}
 const duplicate=MaterialRules.compare(CONFIG,formState.categoryId,formState.subtypeId,formState.attributes,materials);
 if(duplicate.state==="exact"){toast("Vật tư đã tồn tại trong danh mục Material Master.","error");return;}
 const s=subtype(),btn=$("createBtn");
 const material={categoryId:formState.categoryId,subtypeId:formState.subtypeId,materialType:$("materialTypeSelect").value,attributes:structuredClone(formState.attributes),notes:$("notes").value.trim()};
 const requestId=makeRequestId();
 btn.disabled=true;btn.textContent="Đang cấp mã…";
 try{
   const data=await CloudBridge.call("training.create",{actorName:$("actorName").value.trim()||"Hoc vien",requestId,material});
   toast(`Đã cấp mã ${data.material.code}.`,"success");
   await syncData(true);
   if(data.material)showDetail(data.material);
   resetForm();
 }catch(e){toast(e.message,"error");}
 finally{btn.textContent="Gửi yêu cầu cấp mã";updatePreview();}
}
function bind(){
 document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));
 document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.go)));
 $("mobileMenu").addEventListener("click",()=>$("sidebar").classList.toggle("open"));
 $("syncBtn").addEventListener("click",()=>syncData());
 $("categorySelect").addEventListener("change",e=>{formState.categoryId=e.target.value;formState.attributes={};updateSubtypes();});
 $("subtypeSelect").addEventListener("change",e=>{formState.subtypeId=e.target.value;formState.attributes={};const s=subtype();$("materialTypeSelect").value=s.defaultMaterialType;renderFields();updatePreview();});
 $("materialTypeSelect").addEventListener("change",e=>formState.materialType=e.target.value);
 $("resetForm").addEventListener("click",resetForm);
 $("createBtn").addEventListener("click",createMaterial);
 ["searchInput","groupFilter","statusFilter"].forEach(id=>$(id).addEventListener(id==="searchInput"?"input":"change",()=>{page=1;renderCatalog();}));
 $("clearFilters").addEventListener("click",()=>{$("searchInput").value="";$("groupFilter").value="";$("statusFilter").value="";page=1;renderCatalog();});
 $("prevPage").addEventListener("click",()=>{page--;renderCatalog();});$("nextPage").addEventListener("click",()=>{page++;renderCatalog();});
 document.body.addEventListener("click",e=>{
   const row=e.target.closest("tr[data-code]");if(row){const m=materials.find(x=>x.code===row.dataset.code);if(m)showDetail(m);}
   const item=e.target.closest(".duplicate-item");if(item){const m=materials.find(x=>x.code===item.dataset.code);if(m)showDetail(m);}
 });
 document.querySelectorAll("[data-close-modal]").forEach(b=>b.addEventListener("click",()=>$("detailModal").classList.remove("open")));
 document.querySelectorAll("[data-close-barcode]").forEach(b=>b.addEventListener("click",()=>$("barcodeModal").classList.remove("open")));
 $("printLabelBtn").addEventListener("click",()=>{if(selectedMaterial){$("detailModal").classList.remove("open");openBarcode(selectedMaterial);}});
 $("downloadSvgBtn").addEventListener("click",downloadSvg);$("printBarcodeBtn").addEventListener("click",printBarcode);
 ["detailModal","barcodeModal"].forEach(id=>$(id).addEventListener("click",e=>{if(e.target.id===id)e.target.classList.remove("open");}));
}
try{
 const response=await fetch("./assets/data/config.json");if(!response.ok)throw new Error("Không tải được config.json");CONFIG=await response.json();
 materials=loadDemo();initSelectors();bind();renderDashboard();renderCatalog();updatePreview();
 if(CloudBridge.configured)await syncData(true);else setConnection("","Demo cục bộ");
 if("serviceWorker" in navigator && location.protocol.startsWith("http"))navigator.serviceWorker.register("./service-worker.js").catch(()=>{});
}catch(e){console.error(e);document.body.innerHTML=`<div style="padding:30px;font-family:Arial">Không thể khởi tạo ứng dụng: ${escapeHtml(e.message)}</div>`;}
})();