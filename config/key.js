//process.env.NODE_ENV는 환경변수다
if(process.env.NODE_ENV === 'production') {
    //만약에 환경변수가 production이면 prod.js에서 가져오고
    module.exports = require('./prod');
} else {
    module.exports = require('./dev');
}
