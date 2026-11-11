/* Quy tắc chuẩn hóa, sinh tên và phát hiện trùng phía frontend.
   GAS phải lặp lại toàn bộ kiểm tra trước khi lưu. */
window.MaterialRules = (() => {
  const normText = v => String(v ?? "").trim().replace(/\s+/g," ").toUpperCase();
  function normNumber(v){
    if(v === "" || v === null || v === undefined) return "";
    const s = String(v).trim().replace(",",".");
    const n = Number(s);
    if(!Number.isFinite(n) || n <= 0 || !/^\d+(\.\d{1,3})?$/.test(s)) return null;
    return String(Number(n.toFixed(3)));
  }
  const stable = obj => {
    if(Array.isArray(obj)) return `[${obj.map(stable).join(",")}]`;
    if(obj && typeof obj === "object") return `{${Object.keys(obj).sort().map(k=>JSON.stringify(k)+":"+stable(obj[k])).join(",")}}`;
    return JSON.stringify(obj);
  };
  function identityKey(categoryId, subtype, attrs){
    const ids = {};
    subtype.fields.filter(f=>f.identity).forEach(f=>{
      ids[f.id] = f.kind === "number" ? normNumber(attrs[f.id]) : normText(attrs[f.id]);
    });
    return stable({categoryId,subtypeId:subtype.id,identityAttributes:ids});
  }
  function subtypeFor(config, categoryId, subtypeId){
    return (config.formSchemas[categoryId]||[]).find(s=>s.id===subtypeId);
  }
  function validate(config, categoryId, subtypeId, attrs){
    const subtype = subtypeFor(config,categoryId,subtypeId);
    if(!subtype) return {ok:false,message:"Chủng loại vật tư không hợp lệ."};
    for(const f of subtype.fields){
      const v=attrs[f.id];
      if(f.required && (v===undefined || String(v).trim()==="")) return {ok:false,message:`Vui lòng nhập ${f.label.toLowerCase()}.`};
      if(f.kind==="number" && v!==undefined && String(v).trim()!==""){
        const n=normNumber(v);
        if(n===null) return {ok:false,message:`${f.label} phải là số dương, tối đa 3 chữ số thập phân.`};
        if(f.id==="hardness" && (Number(n)<0 || Number(n)>100)) return {ok:false,message:"Độ cứng Shore A phải nằm trong khoảng 0–100."};
      }
      if(f.kind==="select" && v && !f.options.includes(v)) return {ok:false,message:`Giá trị ${f.label} không nằm trong danh sách cho phép.`};
    }
    const n = k => Number(normNumber(attrs[k]));
    if(subtype.id==="STEEL_TUBE" && attrs.outerDiameter && attrs.wall && 2*n("wall")>=n("outerDiameter")) return {ok:false,message:"Ống thép cần thỏa mãn 2 × chiều dày thành ống < đường kính ngoài."};
    if(subtype.id==="RUBBER_RING" && attrs.innerDiameter && attrs.outerDiameter && n("innerDiameter")>=n("outerDiameter")) return {ok:false,message:"Đường kính trong phải nhỏ hơn đường kính ngoài."};
    return {ok:true};
  }
  function displayNum(v){const n=normNumber(v);return n===""?"":n===null?String(v):n;}
  function buildName(config, categoryId, subtypeId, a){
    const s=subtypeFor(config,categoryId,subtypeId); if(!s) return "";
    const d=k=>displayNum(a[k]);
    const dim=(...ks)=>ks.map(d).join("x");
    switch(subtypeId){
      case "STEEL_PLATE": return `Thép tấm ${a.grade||""}${a.standard?" · "+a.standard:""} · ${dim("thickness","width","length")} mm`;
      case "STEEL_ROUND": return `Thép tròn đặc ${a.grade||""}${a.standard?" · "+a.standard:""} · Ø${d("diameter")}x${d("length")} mm`;
      case "STEEL_TUBE": return `Thép ống ${a.grade||""}${a.standard?" · "+a.standard:""} · Ø${d("outerDiameter")}x${d("wall")}x${d("length")} mm`;
      case "STEEL_SECTION": return `Thép hình ${a.profile||""} ${a.size||""} ${a.grade||""}${a.standard?" · "+a.standard:""} · L${d("length")} mm`;
      case "RUBBER_SHEET": return `Cao su tấm ${a.compound||""} · ${d("hardness")} Shore A · ${dim("thickness","width","length")} mm`;
      case "RUBBER_PAD": return `Đệm cao su ${a.compound||""} · ${d("hardness")} Shore A · ${dim("thickness","width","length")} mm`;
      case "RUBBER_RING": return `Vòng cao su ${a.compound||""} · ${d("hardness")} Shore A · Ø${d("outerDiameter")}/${d("innerDiameter")}x${d("thickness")} mm`;
      case "SLIDE_PLATE": return `Tấm trượt ${a.compound||""} · ${dim("thickness","width","length")} mm · ${a.surface||""}`;
      case "SLIDE_DISC": return `Đĩa trượt ${a.compound||""} · Ø${d("diameter")}x${d("thickness")} mm · ${a.surface||""}`;
      case "HEX_BOLT": return `Bu lông lục giác ngoài ${a.standard||""} · ${a.strength||""} · M${d("diameter")}x${d("length")} · ${a.finish||""}`;
      case "SOCKET_BOLT": return `Bu lông lục giác chìm ${a.standard||""} · ${a.strength||""} · M${d("diameter")}x${d("length")} · ${a.finish||""}`;
      default:return s.label;
    }
  }
  function compare(config, categoryId, subtypeId, attrs, materials){
    const subtype=subtypeFor(config,categoryId,subtypeId); if(!subtype) return {state:"neutral",matches:[]};
    const entered=subtype.fields.filter(f=>f.identity && attrs[f.id]!==undefined && String(attrs[f.id]).trim()!=="");
    if(!entered.length) return {state:"neutral",matches:[]};
    const sameGroup=materials.filter(m=>m.categoryId===categoryId && (!m.subtypeId || m.subtypeId===subtypeId));
    const exactKey=identityKey(categoryId,subtype,attrs);
    const exact=sameGroup.find(m=>m.attributesJson && safeKey(m,config)===exactKey);
    if(exact) return {state:"exact",matches:[{material:exact,reason:"Tất cả thuộc tính nhận dạng trùng khớp."}]};
    const candidates=[];
    for(const m of sameGroup){
      let old={}; try{old=typeof m.attributesJson==="string"?JSON.parse(m.attributesJson):(m.attributesJson||{});}catch(e){}
      let matched=[],different=[],unknown=[];
      for(const f of subtype.fields.filter(x=>x.identity)){
        const nv=attrs[f.id], ov=old[f.id];
        if(ov===undefined || ov===null || ov===""){if(nv!==undefined && nv!=="") unknown.push(f.label);}
        else if(nv===undefined || nv==="") unknown.push(f.label);
        else {
          const a=f.kind==="number"?normNumber(nv):normText(nv);
          const b=f.kind==="number"?normNumber(ov):normText(ov);
          if(a!==null && a===b) matched.push(f.label); else different.push(f.label);
        }
      }
      if(matched.length>=1 && (different.length>0 || unknown.length>0 || !m.attributesJson)){
        candidates.push({material:m,reason:`Khớp: ${matched.join(", ")}${different.length?`; khác: ${different.join(", ")}`:""}${unknown.length?`; thiếu dữ liệu: ${unknown.join(", ")}`:""}`,score:matched.length});
      } else if(!m.attributesJson && m.name && (m.name.toUpperCase().includes(String(attrs.grade||attrs.compound||"___").toUpperCase()))){
        candidates.push({material:m,reason:"Bản ghi lịch sử chưa có thuộc tính cấu trúc; cần đối chiếu thủ công.",score:1});
      }
    }
    candidates.sort((a,b)=>b.score-a.score);
    return {state:candidates.length?"similar":"clear",matches:candidates.slice(0,4)};
  }
  function safeKey(m,config){
    const s=subtypeFor(config,m.categoryId,m.subtypeId); if(!s) return "";
    let a={}; try{a=typeof m.attributesJson==="string"?JSON.parse(m.attributesJson):(m.attributesJson||{});}catch(e){}
    return identityKey(m.categoryId,s,a);
  }
  return {normNumber,stable,identityKey,subtypeFor,validate,buildName,compare};
})();