'use strict';
var util = require('util');
var path = require('path');
var yeoman = require('yeoman-generator');
var chalk = require('chalk');


var BootmapGenerator = yeoman.generators.Base.extend({
  init: function () {
    this.pkg = yeoman.file.readJSON(path.join(__dirname, '../package.json'));

    this.on('end', function () {
      if (!this.options['skip-install']) {
        this.npmInstall();
        //this.bowerInstall();
      }
    });
  },

  askFor: function () {
    var done = this.async();

    // have Yeoman greet the user
    console.log(this.yeoman);

    // replace it with a short and sweet description of your generator
    console.log(chalk.magenta('Let\'s make maps!'));

    var prompts = [
      {
        name: 'appName',
        message: 'What is the name of this app?'
      },
      {
        name: 'gitHubAccount',
        message: 'What is your github account? (for package.json)'
      },
      {
        name: 'themeStyle',
        message: 'Theme style? (dark | light)',
        default: 'dark'
      }

    ];

    this.prompt(prompts, function (props) {
      this.appName = props.appName;
      this.authorName = props.authorName;
      this.navClass = 'navbar-inverse';
      if(props.themeStyle !== 'dark'){
        this.navClass = 'navbar-default';
      } 
      this.gitHubAccount = props.gitHubAccount;
      done();
    }.bind(this));
  },

  app: function () {
    this.mkdir('css');
    this.mkdir('js');
    this.template('_package.json', 'package.json');
    this.template('_index.html', 'index.html');

  },

  projectfiles: function () {
    this.directory('css', 'css');
    this.directory('js', 'js');
    this.copy('gitignore', '.gitignore');
    this.copy('gruntfile.js', 'gruntfile.js');
    this.copy('license.txt', 'license.txt');
    this.template('_README.md', 'README.md');
  }, 

  bootstrapFiles: function() {
    var cb = this.async();
    this.remote('Esri', 'bootstrap-map-js', 'master', function (err, remote) {
      if (err) {
        return cb(err);
      }
      remote.directory('src/css', 'css');
      remote.directory('src/images', 'images');
      remote.directory('src/js', 'js');
      cb();
    });
  }
});

module.exports = BootmapGenerator;