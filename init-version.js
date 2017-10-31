const package_json=require('./package.json');
const version=package_json.version;

const fs=require('fs');
const path=require('path');

const PLACEHOLDER="MWS_CLIENT_VERSION";

// substitute the placeholder text "MWS_CLIENT_VERSION" in source files with current version number from package.json
function substitute_dir_src_version(dir){
  var srcs=fs.readdirSync(dir);
  srcs.forEach(src=>{
    var full_path=path.join(dir, src)
    var stat=fs.statSync(full_path);
    if(stat.isFile()){
      var raw=fs.readFileSync(full_path, {encoding: 'utf8'});
      var replaced=raw.replace(PLACEHOLDER, version);
      if(raw!=replaced){
        console.log(`Version number in ${full_path} is replaced!`);
        fs.writeFileSync(full_path, replaced, {encoding: 'utf8'});
      }
    }
  });
}

if(process.argv.length>2){
  var targets=process.argv.slice(2);
  targets.forEach((t)=>{
    substitute_dir_src_version(path.resolve(t));
  });
}
