/* Common requirements */
var express    = require('express'    ) ,
    swig       = require('swig'       ) ,  
    extend     = require('util')._extend, 
    bodyParser = require('body-parser')
;

/* Configuration */

var app = express();

    // Templating
app.engine('html', swig.renderFile);

app.set('view engine', 'html');
app.set('views', __dirname + '/views');

/* Endpoints */

    // Just an index to differentiate between both exercises

app.get('/', function (req, res) {
    res.render('index', { /* template locals context */ });
});

    // Excercise 1), we understand that AngularJS should not
    // be involved here (as said in "static content on the 
    // server-side before AngularJS renders it on the client 
    // side").
    // 
    // Therefore, we just wrote a simple proxy reverse that 
    // reverses a random page request by the user.
    //
    // This proxy is not perfect, it just extracts the body
    // content and the header tags and injects it in the
    // same document's header and footer. However, it 
    // illustrates the desired goal.
    //
    // Some knwon errors easy to solve with some effort:
    //
    // * The header may have two <title/> tags
    //
    // * Due to CORS not being enabled for some resources,
    //   some visual glitches may appear
    //
    // * Due to the alien object form[id="url_form"], the 
    //   html structure is slightly modified and some css
    //   errors may arise.
    //
    //  * I am not detecting nor analyzing encodings, so
    //    some non-ascii characters may not be rendered
    //    properly
    //


var http       = require('http'       ),
    $          = require('cheerio'    )
;

var ex1_default_template_ctx = {
    page_title : 'Exercise 1',
};

app.use(bodyParser.urlencoded({extended:true}));

app
    .get('/test1/', function (req, res) {
        res.render('test1/index', ex1_default_template_ctx);
    })
    .post('/test1', function (req, res){
        var url_to_proxy = req.body.url_to_proxy;
        
        var mod_template_ctx = extend({}, ex1_default_template_ctx);
        mod_template_ctx.url_to_proxy = url_to_proxy;

        http
        .get(url_to_proxy, function (proxy_res){

            var doc = '';
            proxy_res.on('data', function (chunk){
                doc += chunk.toString();
            });

            proxy_res.on('end', function (){
                var domdoc = $(doc);

                var headers = domdoc.find('head').children().toString();
                var body    = domdoc.find('body').children().toString();

                mod_template_ctx.proxied_doc_headers = headers;
                mod_template_ctx.proxied_doc_body    = body   ;

                res.render('test1/index', mod_template_ctx);
            });
        })
        .on('error', function (error){
            mod_template_ctx.error = JSON.stringify(error, null, 4);
            res.render('test1/index', mod_template_ctx);
        });
    });
//--

    // Excercise 2), I understand that is necessary to 
    // implement a system that has a service to get/create
    // submissions with data (we will use something similar
    // to a REST API).
    //
    // This API should use AngularJS and a database. I will
    // use sqlite as I am more used to it and it is easily
    // portable.

app.use(bodyParser.json());

var sqlite = require('sqlite3');

// Create all the necessary tables with two
// test users in a quirk way
//
// * user 'user1' with password 'user1'
// * user 'user2' with password 'user2'
//
sqlite_db = new sqlite.Database(
    __dirname + '/db.sqlite'                  ,
    sqlite.OPEN_READWRITE | sqlite.OPEN_CREATE,
    function (error){

        sqlite_db.run(
            'CREATE TABLE IF NOT EXISTS users (                 \
                id INTEGER AUTO_INCREMENT PRIMARY KEY NOT NULL, \
                username VARCHAR(64) NOT NULL UNIQUE ,          \
                password VARCHAR(64) NOT NULL                   \
            )',
            function (error){
                
                console.log('- Created or updated table users');

                sqlite_db.run(
                    'CREATE TABLE IF NOT EXISTS submissions (        \
                        text TEXT NOT NULL,                         \
                        owner_user INTEGER NOT NULL,                \
                        FOREIGN KEY(owner_user) REFERENCES user(id) \
                    )',
                    function (error){
                        console.log('- Created or updated table submissions');

                        sqlite_db.get('SELECT username FROM users where username="user1"', function (err, row){
                            if (!row){
                                sqlite_db.run('INSERT INTO users (id, username, password) VALUES (1, "user1", "user1")');
                                console.log('- create test user "user1" with password "user1"');
                            }
                        });

                        sqlite_db.get('SELECT username FROM users where username="user2"', function (err, row){
                            if (!row){
                                sqlite_db.run('INSERT INTO users (id, username, password) VALUES (2, "user2", "user2")');
                                console.log('- create test user "user2" with password "user2"');
                            }
                        });
                    }
                );
            }
        );
    }
);

// We need to serve some static files (JS frontend dependencies, partials, etc.)
app.use('/static'          , express.static(__dirname + '/static'          ));
app.use('/bower_components', express.static(__dirname + '/bower_components'));

// The Angular bootstrap url

app.get('/test2', function (req, res){
    res.render('test2/index', {});
});

// API

var loggedin_users = {};

function check_perms(req, res){

    var user_id = loggedin_users[parseInt(req.headers['auth-token'])];

    if (user_id==undefined){
        res.status(403);
        res.send(JSON.stringify({detail: 'forbidden'}));
    }

    return user_id;
}

app
    .get('/rest/v1/submissions/', function (req, res){
        res.setHeader('content-type', 'application/json');
        
        var user_id = check_perms(req, res);

        if (user_id==undefined)
            return;

        sqlite_db.all(
            'SELECT rowid AS id, text FROM submissions WHERE owner_user=? ORDER BY rowid DESC',
            [user_id]                                                     ,
            function (error, rows){
                if (error){
                    var message = {};

                    console.log(error);
                    res.status(400); 
                    message.detail = 'Could not create submission';
                    res.send(JSON.stringify(message));
                }
                else{
                    res.status(200);
                    res.send(JSON.stringify(rows));
                }
            }
        );
    })
    .post('/rest/v1/submissions/', function (req, res){
        res.setHeader('content-type', 'application/json');
        
        var user_id = check_perms(req, res);

        if (user_id==undefined)
            return;

        sqlite_db.run(
            'INSERT INTO submissions (owner_user, text) VALUES (?, ?)',
            [user_id, req.body.text]                                  ,
            function (error){
                var message = {};
                if (error){
                    console.log(error);
                    res.status(400);
                    message.detail = 'Could not create submission';
                }
                else{
                   res.status(200); 
                   message.detail = 'Submission created sucessfully';
                   message.id     = this.lastID;
                }

                res.send(JSON.stringify(message));
            }
        );

    });
//--

// Very simple login system
app.post('/rest/v1/token', function (req, res){
    res.setHeader('content-type', 'application/json');

    sqlite_db.get(
        'SELECT id FROM users WHERE username=? AND password=?', 
        [req.body.username, req.body.password]                ,
        function (err, row){
            var message = {};
            if (err || !row){
                res.status(403);
                message.detail = 'Cannot log in';
            }else{
                var user_id = row.id; 
                // Naive and quick way of generating a login token,
                // this is very insecure but serves it illustrative
                // purpose
                token = Object.keys(loggedin_users).length;
                loggedin_users[token] = user_id;
                message.detail = 'Log in successful';
                message.token  = token;
            }

            res.send(JSON.stringify(message));
        }
    );
});

/* Start application */

app.listen(8080);
