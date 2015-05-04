/* Common requirements */
var express    = require('express'    ) ,
    swig       = require('swig'       ) ,  
    extend     = require('util')._extend 
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

var bodyParser = require('body-parser'),
    http       = require('http'       ),
    $          = require('cheerio'    )
;

var ex1_default_template_ctx = {
    page_title : 'Exercise 1',
};

app.use(bodyParser.urlencoded({extended:true}));

app.get('/test1/', function (req, res) {
    res.render('test1/index', ex1_default_template_ctx);
});

app.post('/test1', function (req, res){
    var url_to_proxy = req.body.url_to_proxy;
    
    var mod_template_ctx = extend(ex1_default_template_ctx, {
        url_to_proxy : url_to_proxy
    });

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
    
    // Excercise 2), I understand that is necessary to 
    // implement a system that has a service to get/create
    // submissions with data (we will use something similar
    // to a REST API).
    //
    // This API should use AngularJS and a database. I will
    // use sqlite as I am more used to it and it is easily
    // portable.

app.use('/static'          , express.static(__dirname + '/static/'          ));
app.use('/bower_components', express.static(__dirname + '/bower_components/'));

app.get('/test2', function (req, res){
    res.render('test2/index', {});
});

/* Start application */

app.listen(8080);
