/* Chế độ A: thay URL bằng GAS /exec của Google Sheet thử nghiệm RIÊNG.
   Để trống URL, ứng dụng hoạt động ở Demo cục bộ và không ghi cloud. */
window.CloudBridge = (() => {
  const GAS_EXEC_URL = "";
  const timeoutMs = 15000;
  async function call(action,payload={}){
    if(!GAS_EXEC_URL) throw new Error("Chưa cấu hình URL GAS. Ứng dụng đang ở chế độ Demo cục bộ.");
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await fetch(GAS_EXEC_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=UTF-8"},body:JSON.stringify({action,payload}),cache:"no-store",credentials:"omit",redirect:"follow",signal:controller.signal});
      if(!response.ok) throw new Error(`GAS phản hồi HTTP ${response.status}.`);
      let result; try{result=await response.json();}catch(e){throw new Error("Phản hồi GAS không phải JSON hợp lệ.");}
      if(!result || result.ok!==true) throw new Error(result?.error?.message || "GAS từ chối yêu cầu.");
      return result.data;
    }catch(e){if(e.name==="AbortError") throw new Error("Kết nối GAS quá thời gian chờ. Hãy thử đồng bộ lại.");throw e;}
    finally{clearTimeout(timer);}
  }
  return {configured:!!GAS_EXEC_URL,call};
})();