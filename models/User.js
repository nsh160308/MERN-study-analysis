const mongoose = require('mongoose');
const bcrypt = require('bcrypt');//bcrypt라이브러리를 가져온다.
const saltRounds = 10;//salt가 몇글자인지 나타내는것이다.(10자리)
const jwt = require('jsonwebtoken');

const userSchema = mongoose.Schema({
    //유저와 관련된 필드를 작성
    name: {
        type: String,
        maxlength: 50
        //maxlength => 최대길이는 50이다.
    },
    email: {
        type: String,
        trim: true, 
        unique: 1 
        //trim => 사용자가 공백문자를 포함해서 이메일을 입력했을 때 공백을 없앤다.
        //unique => 이메일은 고유했으면 좋겠다.
    },
    password: {
        type: String,
        minlength: 5
        //minlength => 최소길이는 5이다. 
    },
    lastname: {
        type: String,
        maxlength: 50
    },
    role: {
        type: Number, 
        default: 0 
        //role은 사용자에게 권한을 주는 것이다.
        //default => role로 권한을 주지 않았다면 default로 0을 주겠다.
    },
    image: String, //그 사람에 해당하는 이미지를 줄 수 있다.
    token: {
        type: String
        //유효성을 관리한다.
    },
    tokenExp: {
        type: Number
        //토큰의 사용기간을 관리한다.
    }
})

//pre()는 mongoose에서 가져온 메소드이다.
//이 메소드에 'save'를 해주면 User 모델에
//유저 정보를 저장하기 전에 무엇인가를 한다는 의미이다.

//헷갈릴점은
//user.save()할때 db에 저장되는 것
//pre()는 User모델에서 db로 저장되기전에 수행할 일을 한다.
userSchema.pre('save', function( next ) {
    console.log('(3)save실행되기전에 여기가 호출되는가?', next);//여기가 호출되면 save하기전에 pre를 실행할 수 있는 것이 증명된다.
    var user = this;
    console.log('(4)변수user에 this를 저장한 값 : ', user);//this가 무엇인지 증명(this는 User모델이다.)
    //User모델이 가지고 있는 정보가 변경됐는지 boolean으로 반환 _id의 상태를 확인하고 싶다.
    //_id는 필드에 등록하지 않았기때문에 수정되거나 기입되지 않아서 false처리 된 것이고
    //role같은 경우에도 아무것도 입력하지 않았으면 필드에서 default시 0으로 처리했기때문에 false로 처리됐다.
    console.log('(5)',user.isModified('name'), user.isModified('email'), user.isModified('password'), user.isModified('role'), user.isModified('_id'));
    if (user.isModified('password')) {
        console.log('(6)salt생성');
        //bcrypt.genSalt(데이터 처리 비용, salt가 생성되면 실행되는 콜백);
        bcrypt.genSalt(saltRounds, function(err, salt){
            console.log('(7)salt생성 후 호출되는 cb');
            console.log('(8)첫번째 인자', err, '두번째 인자', salt);
            
            if(err) {
                console.log('(8-1) error');
                return next(err);
            } 
            
            console.log('(9)암호화');
            //slat는 숫자로 지정하면 지정된 saltRounds 수로 salt가 생성되어 사용된다.
            //bcrypt.hash(암호화할 데이터, 암호를 해시하는 데 사용할 salt, 데이터가 암호화되면 실행되는 콜백함수)
            bcrypt.hash(user.password, salt, function(err, hash){
                console.log('(10)암호화가 성공 후 호출되는 cb');
                if(err) {
                    console.log('(10-1) error');
                    return next(err)
                }
                console.log('(11)교체전 비밀번호', user.password);
                user.password = hash;
                console.log('(12)교체 후 비밀번호', user.password);
                next()
            })
    
            //이곳의 문제점은 회원의 name이나 email등을 바꾸게 될때 비밀번호 암호화 부분이 똑같이 실행된다.
            //비밀번호를 변경하지 않았는데 이곳은 save()하기전에 실행되는 pre()부분이기 때문이다.
            //그렇기 때문에 비밀번호 암호화 부분은 사용자가 비밀번호를 변경할 때 실행될 수 있도록 조건을 걸어줘야된다.
        })
    } else {
        console.log('etc) 비밀번호 변경이 아니기 때문에 암호화 진행중단');
        next();
    }
})


userSchema.methods.comparePassword = function(plainPassword, cb){
    console.log('<5>comparePassword함수 실행');
    console.log('<6>', plainPassword, cb);
    //bcrypt(data, encrypted, cb)
    //data => 비교할 데이터
    //encrypted => 암호화된 비밀번호(비교할 데이터)
    //cb => 데이터 비교되면 실행되는 콜백
    //cb(err, same||isMatch)
    //err => 모든 오류를 설명하는 첫번째 파라미터
    //same||isMatch => 데이터와 암호화된 양식이 일치하는지 여부를 [true/false]로 받는 파라미터
    console.log('<7>비밀번호 비교');
    console.log('<7-1>plainPassword: ',plainPassword, 'this.password: ', this.password);
    bcrypt.compare(plainPassword, this.password, function(err, isMatch){
        console.log('<8>비교 후 실행되는 콜백');
        console.log('<9>err',err,'isMatch',isMatch);
        if(err) {
            console.log('<9-1>err값이 있고, cb호출');
            return cb(err);
        }
        console.log('<9-2>비밀번호가 일치하고 cb호출');
        cb(null, isMatch);
    })
};

userSchema.methods.generateToken = function(cb) {
    console.log('<12>generateToken함수 실행');
    var user = this;
    console.log('<13>this: ',user);
    
    /*
    1.jsonwebtoken을 이용해서 token을 생성한다.
    2._id는 DB에 있는 _id다.
    3.이렇게 user._id + 'secretToken' = token이 생성된다.
    4.나중에 해석할때 'secretToken'을 넣으면 user._id가 나온다.
    5.token을 가지고 이 사람이 누군지 알 수 있다.
    6.따라서, 해당 결과가 필요하기때문에 변수에 저장한다.

    jwt.sign(payload, secretOrPrivateKey, [options, callback])
    (비동기)콜백이 있을때 => err, jwt와 함께 호출
    (동기)콜백이 없을때 => jsonwebtoken을 문자열로 반환
    payload => JSON을 나타내는 리터럴 객체, 버퍼, 문자열 일 수 있다.
    secretOrPrivateKey => 객체, 버퍼, 문자열 일 수 있다.
    */
    console.log('<14>user._id type: ', typeof(user._id));
    var token = jwt.sign(user._id.toHexString(), 'secretToken');
    console.log('<15>생성된 토큰: ', token);
    /*
    toHexString()을 사용해서 user._id를 문자열로 형변환시킨다.
    이 메소드는 mongoDB에서 제공하는 것이다.
    _id를 24바이트 16진수 문자열로 형변환시켜준다.
    */
    console.log('<16>저장 전 토큰: ',user.token);
    user.token = token;//생성된 토큰을 token필드에 저장한다.
    console.log('<17>저장 후 토큰: ', user.token);

    user.save(function(err, user){
        console.log('<18>DB에 저장시도');
        console.log('<19>err: ',err, 'user: ',user);
        if(err) {
            console.log('<19-1>err가 있고 cb호출');
            return cb(err)
        }
        console.log('<19-2>err가 없고 cb호출')
        cb(null, user)
    })
}

userSchema.statics.findByToken = function( token, cb ) {
    console.log("{4}미들웨어에서 findByToken함수 호출해서 실행됨");
    var user = this;
    console.log("{5}statics로 생성한 모델 메소드의 this값 확인: ",this);

    console.log('{6}decode(복호화)시도');
    /*
    jwt.verify(token, secretOrPublicKey, [options, callback])
    콜백이 제공되면 함수가 비동기적으로 작동 첫번째 인자와 두번째 인자가
    유효한 경우 디코딩된 payload와 함께 콜백 호출하고 유효하지 않다면
    오류와 함께 호출된다.
    token => 미들웨어에서 전달한 토큰
    secretOrPublicKey => 로그인 시 토큰 생성할 때, 줬던 문자열
    */
    jwt.verify(token, 'secretToken', function(err, decoded) {
        console.log('{7}비교후 실행되는 cb');
        console.log('{8}err: ',err,"decoded: ",decoded);
        //유저 아이디를 이용해서 유저를 찾은 다음에
        //클라이언트에서 가져온 token과 DB에 보관된 토큰이 일치하는지 확인한다.
        user.findOne({"_id": decoded, "token": token}, function(err, user) {
            console.log('{9}첫번째 인자의 값들이 있는지 찾고난 후 실행되는 cb');
            if(err) {
                console.log('{9-1}일치하는게 없으면 cb호출');
                return cb(err);
            }
            console.log('{9-2]일치하면 cb호출');
            cb(null, user);
        })
    })
}

/*
모델 메소드 만들기
1.methods
2.statics
둘중 무엇으로 만드냐에 따라서 this의 값이 달라진다고 한다.
methods => 모델을 가리킴
statics => 데이터 객체를 가리킴
*/


//위의 스키마는 Model로 감싸줘야 한다.(wrapper)
//첫번째 인자 => 이 모델의 이름(Name)
//두번째 인자 => 스키마
const User = mongoose.model('User',userSchema);

//해당 Model을 다른 곳에서도 사용하고 싶다.
module.exports = { User };