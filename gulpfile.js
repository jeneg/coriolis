var gulp = require('gulp'),
    less = require('gulp-less'),
    jshint = require('gulp-jshint'),
    minifyCSS = require('gulp-minify-css'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
    sourcemaps = require('gulp-sourcemaps'),
    templateCache = require('gulp-angular-templatecache'),
    htmlmin = require('gulp-htmlmin'),
    template = require('gulp-template'),
    mainBowerFiles = require('main-bower-files'),
    del = require('del'),
    runSequence = require('run-sequence'),
    exec = require('child_process').exec
    pkg = require('./package.json');

gulp.task('less', function() {
  return gulp.src('app/less/app.less')
    .pipe(less({paths: ['less/app.less']}))
    .pipe(minifyCSS())
    .pipe(gulp.dest('build'));
});

gulp.task('lint', function() {
  return gulp.src('app/js/**/*.js')
    .pipe(jshint({
      undef: true,
      unused: true,
      curly: true,
      predef: [ "angular",'DB','d3' ]
    }))
    .pipe(jshint.reporter('default'));
});

gulp.task('bower', function(){
  return gulp.src(mainBowerFiles())
    .pipe(uglify({mangle: false}).on('error',function(e){
      console.log('Bower File:', e.fileName);
      console.log('Line:', e.lineNumber);
      console.log('Message:', e.message);
    }))
    .pipe(concat('lib.js'))
    .pipe(gulp.dest('build'));
});

gulp.task('html2js', function() {
  return gulp.src('app/views/**/*.html')
    .pipe(htmlmin({
      'collapseBooleanAttributes': true,
      'collapseWhitespace': true,
      'removeAttributeQuotes': true,
      'removeComments': true,
      'removeEmptyAttributes': true,
      'removeRedundantAttributes': true,
      'removeScriptTypeAttributes': true,
      'removeStyleLinkTypeAttributes': true
    }).on('error',function(e){
      console.log('File:', e.fileName);
      console.log('Message:',e.message);
    }))
    .pipe(templateCache({
      'module': 'app.templates',
      'standalone': true,
      'root': 'views',
      'filename': 'template_cache.js'
    }))
    .pipe(gulp.dest('app/js'))
});

gulp.task('jsonToDB', function(cb) {
  exec('node scripts/json-to-db.js', cb);
});

gulp.task('js', function() {
  return gulp.src([
      'app/js/db.js',
      'app/js/**/module-*.js',
      'app/js/template_cache.js',
      'app/js/app.js',
      'app/js/**/*.js'
    ])
    .pipe(sourcemaps.init())
    .pipe(uglify({mangle: false}).on('error',function(e){
      console.log('File:', e.fileName);
      console.log('Line:', e.lineNumber);
      console.log('Message:', e.message);
    }))
    .pipe(concat('app.js'))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('build'));
});

gulp.task('copy', function() {
  return gulp.src(['app/images/**','app/fonts/**'], {base: 'app/'})
    .pipe(gulp.dest('build'));
});

gulp.task('generateIndexHTML', function() {
  return gulp.src('app/index.html')
    .pipe(template({
      version: pkg.version,
      date : (new Date()).toLocaleDateString()
    }))
    .pipe(gulp.dest('build'));
});

gulp.task('serve', function(cb) {
  exec('nginx -p $(pwd) -c nginx.conf', function (err, stdout, stderr) {
    if (stderr) {
      console.warn(stderr);
      console.warn('Is NGINX already running?\n');
    }
    cb();
  });
});

gulp.task('serve-stop', function(cb) {
  exec('kill -QUIT $(cat nginx.pid)', function (err, stdout, stderr) {
    if (stderr) console.log(stderr); else cb(err);
  });
});

gulp.task('watch', function() {
  gulp.watch('app/index.html', ['generateIndexHTML']);
  gulp.watch(['app/images/**','app/fonts/**'], ['copy']);
  gulp.watch('app/less/*.less', ['less']);
  gulp.watch('app/views/**/*', ['html2js']);
  gulp.watch('app/js/**/*.js', ['js']);
  gulp.watch('data/**/*.json', ['jsonToDB']);
});

gulp.task('clean', function (done) { del(['build'], done); });
gulp.task('build', function (done) { runSequence('clean', ['html2js','jsonToDB'], ['generateIndexHTML','bower','js','less','copy'], done); });
gulp.task('dev', function (done) { runSequence('build', 'serve','watch', done); });

