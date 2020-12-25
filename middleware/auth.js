const { User } = require('../models/User')

let auth = (req, res, next) => {
    console.log("{1}미들웨어 - {인증시도}");
    //이 안에서 인증 처리를 할 것이다.

    //인증 순서

    //클라이언트 쿠키에서 토큰을 가져온다.
    //req.cookies.name
    let token = req.cookies.x_auth;
    console.log("{2}미들웨어 - token: ", token);

    //이 토큰을 복호화 한 뒤, 유저를 찾는다.
    console.log("{3}미들웨어 - findByToken함수 호출");
    User.findByToken(token, (err, user) => {
        console.log("{10}일치하던 일치하지않던 실행되는 cb");
        console.log('{10-0}err',err,'user',user);
        if(err) {
            console.log('{10-1} 일치하지 않아서 실행됨');
            throw err;
        }
        if(!user) {
            console.log('{10-2}일치하는 유저가 없어서 실행');
            return res.json({ isAuth: false, error: true });
        }
        //유저가 있으면 인증 처리 완료
        //request에다가 token과 user를 넣어주는 이유는
        //request를 받을 때 넣어줌으로 인해서
        //Route의 callback에서 user와 token을 기져서 사용할 수 있기 때문이다.
        console.log('{11}토큰이 일치해 유저가 있으니 실행');
        req.token = token;
        console.log('{12}req.token: ', req.token);
        req.user = user;
        console.log('{13}req.user: ', req.user);
        next(); //next()하는 이유는 미들웨어에서 다음으로 갈 수 있게 해주는 것이다.
    })

}





module.exports = { auth };

