const express = require('express')//express모듈을 가져온다.
const mongoose = require('mongoose');//mongoDB 연결
const port = 5000//port번호를 정한다.
const bodyParser = require('body-parser');//body-parser모듈 가져오기
const cookieParser = require('cookie-parser');//cookie-parser모듈 가져오기
const config = require('./config/key');
const { User } = require('./models/User');//모델 가져오기
const { auth } = require('./middleware/auth');//인증 가져오기

const app = express();//가져온 express의 function을 이용해서 새로운 app을 만든다.
//bodyParser옵션 주기
//application/x-www-form-urlencoded로 되어있는 데이터를 분석해서 가져올 수 있게 해주는 코드
app.use(bodyParser.urlencoded({extended: true}));

//application/json로 되어있는 데이터를 분석해서 가져올 수 있도록 해주는 코드
app.use(bodyParser.json());
//app.use()로 cookieParser 라이브러리 사용
app.use(cookieParser());


//mongoDB계정 정보를 보호하려고 따로 폴더를 뺐으면 이 안에 들어가야되는 것은
//그 폴더를 사용할 수 있게 require하고 그것을 첫번째 인자로준다.
mongoose.connect(config.mongoURI,{
    useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false
}).then(() => console.log("MongoDB Connected..."))
  .catch(err => console.log(err))

//root 디렉토리에 send()메세지를 보낸다.
//이런 것들이 Route라고 하는 거 같다.
app.get('/', (req, res) => {
  res.send('Hello World! 안녕하세요^^. 새해복 많이 받으세요 nodemon이 동작되나요?')
})

//회원가입을 위한 Register Route 생성
app.post('/api/users/register', (req, res) => {
    console.log('(1)request : ', req.body);
    const user = new User(req.body);//User.js에서 정의한 모델 userSchema를 wrapper함
    console.log('(2)user : ', user);

    //save는 몽고db에 데이터 저장한다는 것
    user.save((err, userInfo) => {
        console.log('(13)pre가 끝나고 실행되는 cb');
        console.log('(14)err', err, 'userInfo', userInfo);
        if(err) {
            console.log('(14-1)err에 값이 존재해서 출력됨');
            return res.json(
                { success: false, err }
            );
        }
        console.log('(15)err에 값이 없어서 출력됨');
        return res.status(200).json({
            success: true
        })
    })
})

//로그인을 위한 Route생성
app.post('/api/users/login', (req, res) => {
    console.log("<1>로그인 시도");
    console.log('<2>request', req.body);
    //findOne((조건)객체, (콜백)콜백)
    //반환 => 쿼리
    //조건이 null이거나 undefined이면, 빈 findOne명령을 전송해 임의 문서를 반환
    //_id로 쿼리하는 경우 findByid()를 쓴다.
    User.findOne({ email: req.body.email }, (err, user) => {
        
        if(!user) {
            console.log("<3-1>첫번째 인자를 찾아서 없으면", err);
            return res.json({
                loginSuccess: false,
                message: "제공된 이메일에 해당하는 유저가 없습니다."
            })
        } else console.log('<3>첫번째 인자를 찾아서 있으면', user);
        
        //비밀번호 일치 확인(내가 만든 함수를 호출)
        console.log('<4>비밀번호 확인 - comparePassword함수 호출');
        user.comparePassword(req.body.password, (err, isMatch) => {
            //여기는 실험하니 일치하든 일치하지 않든 cb을 호출하기 때문에 주의
            console.log('<10-0>err확인: ',err);
            //비밀번호 불일치
            if(!isMatch){
                console.log('<10>cb실행 - 비밀번호 불일치');
                return res.json({ loginSuccess: false, message: "비밀번호가 틀렸습니다."})
            }
            console.log('<10>cb 실행 - 비밀번호 일치');
            //비밀번호까지 맞다면 그 유저에 맞는 토큰을 생성
            //User모델을 관리하는 User.js에서 토큰을 생성해주는 함수를 만든다.
            console.log('<11>토큰 생성 - generateToken함수 호출');
            user.generateToken((err, user) => {
                console.log('<20>cb실행');
                if(err) {
                    console.log('<20-1>err확인: ',err);
                    return res.status(400).send(err);
                }
                console.log('<20-2>err없으니 user확인: ', user);
                /*
                에러가 없다면 user정보를 가져오는데 token이 저장되어있다.
                쿠키에다가 token을 보관한다.
                보관하기 위해서 cookie-parser라이브러리를 설치한다.

                res.cookie(name, value)
                name => 쿠키 이름을 값으로 설정
                value => JSON으로 변환된 문자열 또는 객체
                */
                console.log('<login-finish>토큰을 쿠키에 저장');
                res.cookie("x_auth",user.token)
                .status(200)
                .json({ loginSuccess: true, userId: user._id });
            })
        })
    })
})


// role 0 -> 일반유저 role !0 -> 관리자


//Authentication(인증) Route생성
//여기에서는 auth라는 미들웨어를 추가할 것이다.
//미들웨어란 엔드포인트에 request를 받은 다음에
//callback하기전에 중간에서 무엇을 해주는 것이다.
app.get('/api/users/auth', auth, (req, res) => {
    console.log('&1 인증끝나고 실행되는 cb');
    console.log('&2 req: ',req.user);
    //결론적으로 여기까지 도달했다는 것은 auth라는 미들웨어에서
    //인증처리를 진행했고 인증이 완료돼서 이곳으로 넘어왔다는 것이다.
    //이제 인증이 완료됐다고 클라이언트에 정보를 전달해주면 된다.
    res.status(200).json({
        //유저 정보들을 전달해주면 되는데 User모델에 정의한 것들이다.
        //굳이 다 전달할 필요없고 원하는것만 전달하면된다.
        //이렇게 할 수 있는 이유는 auth미들웨어에서 request로 user정보를
        //넘겨줬기 때문이다.
        _id: req.user_id,
        isAdmin: req.user.role === 0 ? false : true, //여기는 바꿀수 있다.
        isAuth: true,
        email: req.user.email,
        name: req.user.name,
        lastname: req.user.lastname,
        role: req.user.role,
        image: req.user.image
    })
})

//로그아웃 Route생성
//로그아웃 하려는 유저를 데이터베이스에 찾아서
//그 데이터베이스 유저의 토큰을 지워주면된다.
//왜 토큰을 지워주면 되냐면
//auth Route에서 인증을 할때
//클라이언트 쿠키에 들어있는 토큰을 가져와서
//db에 있는 토큰과 같은지 확인하면서 인증을 시켰는데
//이 토큰이 db에 없으면은 인증이 맞지 않기 때문에 인증이 안되고
//로그아웃할 때 토큰을 지워주게 되면 로그인 기능이 풀려버린다.

//로그아웃이면 로그인 된 상태기 때문에 auth미들웨어를 넣는다.

/*
Model.findOneAndUpdate(업데이트할 객체,업데이트 객체,콜백)
첫번째 인자와 일치하는 것을 찾고
두번째 인자에 따라 업데이트를 한 후
콜백한테 전달
*/
app.get("/api/users/logout", auth, (req, res) => {
    console.log('{14}미들웨어가 끝난 후 실행되는 cb');
    console.log('[1]로그아웃 시도');
    console.log('[1-1]request: ', req.body);
    User.findOneAndUpdate({ _id: req.user._id },
        { token: ""},
        (err, user) => {
            console.log('[2]업데이트 후 실행되는 cb');
            console.log('[3]err',err,' user',user);
            if(err){
                console.log('[3-1]err있어서 호출됨');
                return res.json({ success: false, err });
            }
            console.log('[3-2]정상업데이트');
            return res.status(200).send({
                success: true
            })
        })
})


//5000번 포트에서 이것이 실행된다.
//만약에 app이 5000번에 listen을 하면 해당 console이 출력
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})