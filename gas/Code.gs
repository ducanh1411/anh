/*
 * MATERIAL MASTER - ERP TRAINING / MODE A
 * Dữ liệu demo riêng. Không dùng với dữ liệu ERP sản xuất.
 * 1) Tạo Google Sheet mới; 2) Extensions > Apps Script; 3) dán file này;
 * 4) chạy setup(); 5) Deploy Web App theo README.
 */
const CFG = {
  TRAINING_ENABLED: true,
  SCHEMA_VERSION: "erp-attribute-v1",
  PREFIX: "A",
  DIGITS: 6,
  SHEETS: { MATERIALS:"MATERIALS", RANGES:"NUMBER_RANGES", AUDIT:"AUDIT_LOG" }
};
const MATERIAL_HEADERS = ["id","code","name","categoryId","unit","materialType","grade","standard","dimensions","technicalSpecification","notes","status","codeOrigin","origin","createdAt","updatedAt","createdBy","updatedBy","revision","requestId","attributesJson"];
const RANGE_HEADERS = ["series","prefix","digits","lastNumber","nextCode","enabled","updatedAt"];
const AUDIT_HEADERS = ["eventId","at","actorId","action","materialCode","requestId","beforeJson","afterJson","result"];

function setup(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  if(!ss) throw new Error("Hãy tạo Apps Script gắn với một Google Sheets riêng.");
  ensureSheet_(ss,CFG.SHEETS.MATERIALS,MATERIAL_HEADERS);
  ensureSheet_(ss,CFG.SHEETS.RANGES,RANGE_HEADERS);
  ensureSheet_(ss,CFG.SHEETS.AUDIT,AUDIT_HEADERS);
  let sh=ss.getSheetByName(CFG.SHEETS.RANGES);
  if(sh.getLastRow()<2) sh.appendRow(["MATERIAL_AUTO",CFG.PREFIX,CFG.DIGITS,0,"A000001",true,new Date().toISOString()]);
  PropertiesService.getScriptProperties().setProperty("TRAINING_ENABLED","true");
  return "Setup hoàn tất. Chỉ sử dụng dữ liệu đào tạo.";
}
function ensureSheet_(ss,name,headers){
  let sh=ss.getSheetByName(name)||ss.insertSheet(name);
  if(sh.getLastRow()===0) sh.appendRow(headers);
  else {
    const existing=sh.getRange(1,1,1,headers.length).getValues()[0];
    if(headers.some((h,i)=>existing[i]!==h)) throw new Error("Header không đúng tại sheet "+name);
  }
  sh.setFrozenRows(1);return sh;
}
function doGet(){return json_({ok:true,data:{service:"Material Master Training GAS",version:"1.0-training"}});}
function doPost(e){
  try{
    const req=JSON.parse(e&&e.postData&&e.postData.contents||"{}");
    const action=String(req.action||"");
    const payload=req.payload||{};
    let data;
    switch(action){
      case "ping": data={service:"Material Master Training GAS",version:"1.0-training"};break;
      case "training.status": data=status_();break;
      case "training.list": data=list_();break;
      case "training.create": data=create_(payload);break;
      default: return json_({ok:false,error:{code:"ACTION_NOT_ALLOWED",message:"Tác vụ không được phép."}});
    }
    return json_({ok:true,data,version:"1.0-training"});
  }catch(err){
    return json_({ok:false,error:{code:"REQUEST_FAILED",message:safeMessage_(err)}});
  }
}
function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
function safeMessage_(e){const s=String(e&&e.message||e||"Có lỗi xảy ra.");return s.length>240?s.slice(0,240):s;}
function status_(){
  return {enabled:PropertiesService.getScriptProperties().getProperty("TRAINING_ENABLED")==="true",mode:"TRAINING_PUBLIC",canCreate:PropertiesService.getScriptProperties().getProperty("TRAINING_ENABLED")==="true",attributeSchemaVersion:CFG.SCHEMA_VERSION};
}
function list_(){
  const sh=SpreadsheetApp.getActive().getSheetByName(CFG.SHEETS.MATERIALS);
  const rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,MATERIAL_HEADERS.length).getValues():[];
  const materials=rows.filter(r=>r[1]).map(rowToMaterial_);
  return {materials,count:materials.length};
}
function rowToMaterial_(r){
  let attrs={};try{attrs=JSON.parse(r[20]||"{}");}catch(e){}
  return {id:r[0],code:r[1],name:r[2],categoryId:r[3],subtypeId:attrs._subtypeId||"",unit:r[4],materialType:r[5],grade:r[6],standard:r[7],dimensions:r[8],technicalSpecification:r[9],notes:r[10],status:r[11],codeOrigin:r[12],origin:r[13],createdAt:r[14],updatedAt:r[15],createdBy:r[16],updatedBy:r[17],revision:r[18],requestId:r[19],attributesJson:r[20]};
}
function create_(p){
  if(PropertiesService.getScriptProperties().getProperty("TRAINING_ENABLED")!=="true") throw new Error("Chế độ tạo dữ liệu đào tạo hiện đang tắt.");
  const actor=cleanText_(p.actorName||"Hoc vien",60);
  if(/^[=+\-@]/.test(actor))throw new Error("Tên người khai báo không hợp lệ.");
  const requestId=String(p.requestId||"");
  if(!/^[A-Za-z0-9_-]{12,100}$/.test(requestId)) throw new Error("requestId không hợp lệ.");
  const m=p.material||{};
  validateMaterial_(m);
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(25000)) throw new Error("Hệ thống đang xử lý yêu cầu khác. Vui lòng thử lại.");
  try{
    const ss=SpreadsheetApp.getActive();
    const sh=ss.getSheetByName(CFG.SHEETS.MATERIALS);
    const rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,MATERIAL_HEADERS.length).getValues():[];
    const replay=rows.map(rowToMaterial_).find(x=>x.requestId===requestId);
    const canonical=canonicalMaterial_(m);
    if(replay){
      let replayAttrs={};try{replayAttrs=JSON.parse(replay.attributesJson||"{}");}catch(e){}
      delete replayAttrs._subtypeId;
      if(replay.createdBy!==actor||JSON.stringify(sortObject_(replayAttrs))!==JSON.stringify(sortObject_(canonical.attributes))||replay.categoryId!==canonical.categoryId||replay.subtypeId!==canonical.subtypeId||replay.materialType!==canonical.materialType) throw new Error("requestId đã được sử dụng cho nội dung khác.");
      return {material:replay,idempotentReplay:true};
    }
    const duplicate=rows.map(rowToMaterial_).find(x=>sameIdentity_(x,canonical));
    if(duplicate) throw new Error("DUPLICATE_MATERIAL: Vật tư đã tồn tại trong danh mục Material Master với mã "+duplicate.code+".");
    const rangeSh=ss.getSheetByName(CFG.SHEETS.RANGES);
    const rangeRows=rangeSh.getDataRange().getValues();
    const ri=rangeRows.findIndex((r,i)=>i>0&&r[0]==="MATERIAL_AUTO"&&r[5]===true);
    if(ri<1) throw new Error("Không tìm thấy dải cấp mã đang bật.");
    const range=rangeRows[ri],prefix=String(range[1]),digits=Number(range[2]);
    let last=Number(range[3])||0;
    const used=new Set(rows.map(r=>String(r[1])));
    // Reconcile counter against actual codes before issuing the next number.
    rows.forEach(r=>{const match=String(r[1]).match(new RegExp("^"+prefix+"(\\d{"+digits+"})$"));if(match)last=Math.max(last,Number(match[1]));});
    let next=last+1,code=prefix+String(next).padStart(digits,"0");
    while(used.has(code)){next++;code=prefix+String(next).padStart(digits,"0");}
    const now=new Date().toISOString(),id=Utilities.getUuid();
    const name=buildName_(canonical.categoryId,canonical.subtypeId,canonical.attributes);
    const summary=summarize_(canonical);
    const material={id,code,name,categoryId:canonical.categoryId,subtypeId:canonical.subtypeId,unit:summary.unit,materialType:canonical.materialType,grade:summary.grade,standard:summary.standard,dimensions:summary.dimensions,technicalSpecification:summary.technicalSpecification,notes:canonical.notes,status:"ACTIVE",codeOrigin:"SYSTEM_GENERATED",origin:"TRAINING",createdAt:now,updatedAt:now,createdBy:actor,updatedBy:actor,revision:1,requestId,attributesJson:JSON.stringify(canonical.attributes)};
    material.attributesJson=JSON.stringify(Object.assign({},canonical.attributes,{_subtypeId:canonical.subtypeId}));
    const row=[material.id,material.code,material.name,material.categoryId,material.unit,material.materialType,material.grade,material.standard,material.dimensions,material.technicalSpecification,material.notes,material.status,material.codeOrigin,material.origin,material.createdAt,material.updatedAt,material.createdBy,material.updatedBy,material.revision,material.requestId,material.attributesJson];
    sh.appendRow(row);
    rangeSh.getRange(ri+1,4,1,4).setValues([[next,prefix+String(next+1).padStart(digits,"0"),true,now]]);
    ss.getSheetByName(CFG.SHEETS.AUDIT).appendRow([Utilities.getUuid(),now,actor,"CREATE",code,requestId,"",JSON.stringify({code,name}),"SUCCESS"]);
    return {material,idempotentReplay:false};
  }finally{lock.releaseLock();}
}
function validateMaterial_(m){
  const allowedCats=["THEP","CAO_SU","TAM_TRUOT","BU_LONG"];
  const schema={
    THEP:{STEEL_PLATE:{unit:"Tấm",required:["grade","thickness","width","length"],identity:["grade","standard","thickness","width","length"],numbers:["thickness","width","length"]},STEEL_ROUND:{unit:"Thanh",required:["grade","diameter","length"],identity:["grade","standard","diameter","length"],numbers:["diameter","length"]},STEEL_TUBE:{unit:"Thanh",required:["grade","outerDiameter","wall","length"],identity:["grade","standard","outerDiameter","wall","length"],numbers:["outerDiameter","wall","length"]},STEEL_SECTION:{unit:"Thanh",required:["profile","size","grade","length"],identity:["profile","size","grade","standard","length"],numbers:["length"]}},
    CAO_SU:{RUBBER_SHEET:{unit:"Tấm",required:["compound","hardness","thickness","width","length"],identity:["compound","hardness","thickness","width","length"],numbers:["hardness","thickness","width","length"]},RUBBER_PAD:{unit:"Cái",required:["compound","hardness","width","length","thickness"],identity:["compound","hardness","width","length","thickness"],numbers:["hardness","width","length","thickness"]},RUBBER_RING:{unit:"Cái",required:["compound","hardness","outerDiameter","innerDiameter","thickness"],identity:["compound","hardness","outerDiameter","innerDiameter","thickness"],numbers:["hardness","outerDiameter","innerDiameter","thickness"]}},
    TAM_TRUOT:{SLIDE_PLATE:{unit:"Tấm",required:["compound","thickness","width","length","surface"],identity:["compound","thickness","width","length","surface"],numbers:["thickness","width","length"]},SLIDE_DISC:{unit:"Cái",required:["compound","diameter","thickness","surface"],identity:["compound","diameter","thickness","surface"],numbers:["diameter","thickness"]}},
    BU_LONG:{HEX_BOLT:{unit:"Cái",required:["standard","strength","diameter","length","finish"],identity:["standard","strength","diameter","length","finish"],numbers:["diameter","length"]},SOCKET_BOLT:{unit:"Cái",required:["standard","strength","diameter","length","finish"],identity:["standard","strength","diameter","length","finish"],numbers:["diameter","length"]}}
  };
  if(!allowedCats.includes(m.categoryId)||!schema[m.categoryId]||!schema[m.categoryId][m.subtypeId])throw new Error("Nhóm hoặc chủng loại vật tư không hợp lệ.");
  if(!["ROH","HALB","HIBE"].includes(m.materialType))throw new Error("Loại vật tư không hợp lệ.");
  const s=schema[m.categoryId][m.subtypeId],a=m.attributes||{};
  const allowedKeys={STEEL_PLATE:["grade","standard","thickness","width","length"],STEEL_ROUND:["grade","standard","diameter","length"],STEEL_TUBE:["grade","standard","outerDiameter","wall","length"],STEEL_SECTION:["profile","size","grade","standard","length"],RUBBER_SHEET:["compound","hardness","thickness","width","length"],RUBBER_PAD:["compound","hardness","width","length","thickness"],RUBBER_RING:["compound","hardness","outerDiameter","innerDiameter","thickness"],SLIDE_PLATE:["compound","thickness","width","length","surface"],SLIDE_DISC:["compound","diameter","thickness","surface"],HEX_BOLT:["standard","strength","diameter","length","finish"],SOCKET_BOLT:["standard","strength","diameter","length","finish"]}[m.subtypeId];
  if(Object.keys(a).some(k=>!allowedKeys.includes(k)))throw new Error("Thuộc tính chứa trường không được hỗ trợ.");
  const choices={profile:["H","I","U","V","L","C"],compound:["NR","EPDM","CR","Silicone","PTFE","M-PTFE","UHMWPE"],surface:["Trơn","Có rãnh","Có lỗ"],standard:["ISO 4017","ISO 4014","DIN 933","DIN 931","ISO 4762","DIN 912"],strength:["4.6","5.6","8.8","10.9","12.9","A2-70"],finish:["Không mạ","Mạ kẽm điện phân","Mạ kẽm nhúng nóng","Inox"]};
  Object.keys(choices).forEach(k=>{if(a[k]!==undefined&&k!=="standard"&&!choices[k].includes(String(a[k])))throw new Error("Giá trị lựa chọn không hợp lệ: "+k);});
  if(["HEX_BOLT","SOCKET_BOLT"].includes(m.subtypeId)&&!choices.standard.includes(String(a.standard)))throw new Error("Tiêu chuẩn bu lông không hợp lệ.");
  if(typeof a!=="object"||Array.isArray(a))throw new Error("Thuộc tính vật tư không hợp lệ.");
  s.required.forEach(k=>{if(a[k]===undefined||String(a[k]).trim()==="")throw new Error("Thiếu thông số bắt buộc: "+k);});
  s.numbers.forEach(k=>{const n=parseNum_(a[k]);if(n===null||n<=0)throw new Error("Thông số số học không hợp lệ: "+k);a[k]=String(n);});
  if(m.subtypeId==="STEEL_TUBE"&&2*Number(a.wall)>=Number(a.outerDiameter))throw new Error("Ống thép cần thỏa mãn 2 × wall < outerDiameter.");
  if(m.subtypeId==="RUBBER_RING"&&Number(a.innerDiameter)>=Number(a.outerDiameter))throw new Error("Đường kính trong phải nhỏ hơn đường kính ngoài.");
  if((m.subtypeId==="RUBBER_SHEET"||m.subtypeId==="RUBBER_PAD"||m.subtypeId==="RUBBER_RING")&&(Number(a.hardness)<0||Number(a.hardness)>100))throw new Error("Độ cứng Shore A phải từ 0 đến 100.");
  Object.keys(a).forEach(k=>{a[k]=cleanText_(a[k],100);if(/^[=+\-@]/.test(a[k]))throw new Error("Giá trị thuộc tính không được bắt đầu bằng ký tự công thức.");});
  if(String(m.notes||"").length>500)throw new Error("Ghi chú vượt quá 500 ký tự.");
  if(/^[=+\-@]/.test(String(m.notes||"").trim()))throw new Error("Ghi chú không được bắt đầu bằng ký tự công thức.");
}
function parseNum_(v){if(typeof v!=="string"&&typeof v!=="number")return null;const s=String(v).trim().replace(",",".");if(!/^\d+(\.\d{1,3})?$/.test(s))return null;const n=Number(s);return Number.isFinite(n)?Number(n.toFixed(3)):null;}
function cleanText_(v,max){const s=String(v??"").trim().replace(/\s+/g," ");if(s.length>max)throw new Error("Dữ liệu vượt quá giới hạn ký tự.");return s;}
function canonicalMaterial_(m){return {categoryId:m.categoryId,subtypeId:m.subtypeId,materialType:m.materialType,attributes:m.attributes,notes:cleanText_(m.notes||"",500)};}
function sameIdentity_(old,m){
  if(old.categoryId!==m.categoryId||old.subtypeId!==m.subtypeId)return false;
  const identity=identityFields_(m.subtypeId);
  if(!identity.length)return false;
  let a={};try{a=JSON.parse(old.attributesJson||"{}");}catch(e){return false;}
  return identity.every(k=>normalize_(a[k])===normalize_(m.attributes[k]));
}
function identityFields_(subtype){
  const map={STEEL_PLATE:["grade","standard","thickness","width","length"],STEEL_ROUND:["grade","standard","diameter","length"],STEEL_TUBE:["grade","standard","outerDiameter","wall","length"],STEEL_SECTION:["profile","size","grade","standard","length"],RUBBER_SHEET:["compound","hardness","thickness","width","length"],RUBBER_PAD:["compound","hardness","width","length","thickness"],RUBBER_RING:["compound","hardness","outerDiameter","innerDiameter","thickness"],SLIDE_PLATE:["compound","thickness","width","length","surface"],SLIDE_DISC:["compound","diameter","thickness","surface"],HEX_BOLT:["standard","strength","diameter","length","finish"],SOCKET_BOLT:["standard","strength","diameter","length","finish"]};
  return map[subtype]||[];
}
function sortObject_(o){const out={};Object.keys(o||{}).sort().forEach(k=>out[k]=o[k]);return out;}

function normalize_(v){if(v===undefined||v===null)return "";const n=parseNum_(v);return n===null?String(v).trim().replace(/\s+/g," ").toUpperCase():String(n);}
function buildName_(c,s,a){
 const n=k=>String(parseNum_(a[k])??a[k]??"");
 switch(s){
 case"STEEL_PLATE":return`Thép tấm ${a.grade}${a.standard?" · "+a.standard:""} · ${n("thickness")}x${n("width")}x${n("length")} mm`;
 case"STEEL_ROUND":return`Thép tròn đặc ${a.grade}${a.standard?" · "+a.standard:""} · Ø${n("diameter")}x${n("length")} mm`;
 case"STEEL_TUBE":return`Thép ống ${a.grade}${a.standard?" · "+a.standard:""} · Ø${n("outerDiameter")}x${n("wall")}x${n("length")} mm`;
 case"STEEL_SECTION":return`Thép hình ${a.profile} ${a.size} ${a.grade}${a.standard?" · "+a.standard:""} · L${n("length")} mm`;
 case"RUBBER_SHEET":return`Cao su tấm ${a.compound} · ${n("hardness")} Shore A · ${n("thickness")}x${n("width")}x${n("length")} mm`;
 case"RUBBER_PAD":return`Đệm cao su ${a.compound} · ${n("hardness")} Shore A · ${n("thickness")}x${n("width")}x${n("length")} mm`;
 case"RUBBER_RING":return`Vòng cao su ${a.compound} · ${n("hardness")} Shore A · Ø${n("outerDiameter")}/${n("innerDiameter")}x${n("thickness")} mm`;
 case"SLIDE_PLATE":return`Tấm trượt ${a.compound} · ${n("thickness")}x${n("width")}x${n("length")} mm · ${a.surface}`;
 case"SLIDE_DISC":return`Đĩa trượt ${a.compound} · Ø${n("diameter")}x${n("thickness")} mm · ${a.surface}`;
 case"HEX_BOLT":return`Bu lông lục giác ngoài ${a.standard} · ${a.strength} · M${n("diameter")}x${n("length")} · ${a.finish}`;
 case"SOCKET_BOLT":return`Bu lông lục giác chìm ${a.standard} · ${a.strength} · M${n("diameter")}x${n("length")} · ${a.finish}`;
 }
 throw new Error("Không sinh được tên vật tư.");
}
function summarize_(m){
 const a=m.attributes,grade=a.grade||a.compound||"",standard=a.standard||"",dimensions=Object.entries(a).filter(([k])=>["thickness","width","length","diameter","outerDiameter","innerDiameter","wall","size"].includes(k)).map(([k,v])=>k+":"+v).join("; ");
 return {unit:unit_(m.subtypeId),grade,standard,dimensions,technicalSpecification:Object.entries(a).filter(([k])=>!["grade","standard","thickness","width","length","diameter","outerDiameter","innerDiameter","wall","size"].includes(k)).map(([k,v])=>k+":"+v).join("; ")};
}
function unit_(s){return ({STEEL_PLATE:"Tấm",STEEL_ROUND:"Thanh",STEEL_TUBE:"Thanh",STEEL_SECTION:"Thanh",RUBBER_SHEET:"Tấm",RUBBER_PAD:"Cái",RUBBER_RING:"Cái",SLIDE_PLATE:"Tấm",SLIDE_DISC:"Cái",HEX_BOLT:"Cái",SOCKET_BOLT:"Cái"})[s]||"Cái";}
