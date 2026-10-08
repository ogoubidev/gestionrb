package com.ogoubidev.gestionrb;
import android.app.*;
import android.os.*;
import android.content.*;
import android.net.Uri;
import android.webkit.*;
import android.util.Base64;
import android.widget.Toast;
import java.io.*;

public class MainActivity extends Activity {
 private WebView web;
 private ValueCallback<Uri[]> upload;
 private byte[] pending;
 private static final int PICK=10, SAVE=11;
 @Override public void onCreate(Bundle state) {
  super.onCreate(state);
  web=new WebView(this); setContentView(web);
  web.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});
  web.getSettings().setJavaScriptEnabled(true);
  web.getSettings().setDomStorageEnabled(true);
  web.getSettings().setAllowFileAccess(false);
  web.getSettings().setAllowContentAccess(true);
  web.addJavascriptInterface(new Downloads(), "AndroidDownloads");
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request) {
    Uri u=request.getUrl();
    if("https".equals(u.getScheme()) && "gestionrb.floot.app".equals(u.getHost())) return false;
    try { startActivity(new Intent(Intent.ACTION_VIEW,u)); } catch(Exception e) { Toast.makeText(MainActivity.this,"Lien indisponible",Toast.LENGTH_SHORT).show(); }
    return true;
   }
  });
  web.setWebChromeClient(new WebChromeClient(){
   @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> cb,FileChooserParams p){
    if(upload!=null) upload.onReceiveValue(null);
    upload=cb;
    try { startActivityForResult(p.createIntent(),PICK); return true; }
    catch(Exception e){ upload=null; return false; }
   }
  });
  web.setDownloadListener((url,agent,disposition,mime,length)->{
   if(url.startsWith("blob:") || url.startsWith("data:")){
    String name=URLUtil.guessFileName(url,disposition,mime);
    if(name==null || name.equals("downloadfile") || name.endsWith(".bin"))
      name="application/pdf".equals(mime)?"gestion-rb.pdf":"gestion-rb.json";
    String script="fetch("+org.json.JSONObject.quote(url)+").then(r=>r.blob()).then(b=>{let f=new FileReader();f.onload=()=>AndroidDownloads.save(f.result,"+org.json.JSONObject.quote(name)+");f.readAsDataURL(b)}).catch(()=>AndroidDownloads.error())";
    web.evaluateJavascript(script,null);
   } else {
    try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(url)));}catch(Exception e){Toast.makeText(this,"Téléchargement indisponible",Toast.LENGTH_LONG).show();}
   }
  });
  if(state!=null) web.restoreState(state); else web.loadUrl("https://gestionrb.floot.app");
 }
 class Downloads {
  @JavascriptInterface public void save(String data,String name){
   runOnUiThread(()->{
    if(web.getUrl()==null || !"gestionrb.floot.app".equals(Uri.parse(web.getUrl()).getHost())) return;
    try {
     int comma=data.indexOf(',');
     if(comma<0 || data.length()>100000000) throw new IOException();
     pending=Base64.decode(data.substring(comma+1),Base64.DEFAULT);
     String safe=name.replaceAll("[^a-zA-Z0-9._-]","_");
     Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);
     i.setType(safe.endsWith(".pdf")?"application/pdf":"application/json");i.putExtra(Intent.EXTRA_TITLE,safe);
     startActivityForResult(i,SAVE);
    }catch(Exception e){pending=null;Toast.makeText(MainActivity.this,"Impossible de préparer le fichier",Toast.LENGTH_LONG).show();}
   });
  }
  @JavascriptInterface public void error(){runOnUiThread(()->Toast.makeText(MainActivity.this,"Échec du téléchargement",Toast.LENGTH_LONG).show());}
 }
 @Override protected void onActivityResult(int request,int result,Intent data){
  super.onActivityResult(request,result,data);
  if(request==PICK && upload!=null){upload.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,data));upload=null;}
  if(request==SAVE){
   if(result==RESULT_OK && data!=null && data.getData()!=null && pending!=null){
    try(OutputStream out=getContentResolver().openOutputStream(data.getData())){out.write(pending);Toast.makeText(this,"Fichier enregistré",Toast.LENGTH_SHORT).show();}
    catch(Exception e){Toast.makeText(this,"Échec de l'enregistrement",Toast.LENGTH_LONG).show();}
   }pending=null;
  }
 }
 @Override protected void onSaveInstanceState(Bundle b){super.onSaveInstanceState(b);web.saveState(b);}
 @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
}
