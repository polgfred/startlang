module.exports = function(grunt) {
  grunt.initConfig({
    watch: {
      config: {
        files: [ 'Gruntfile.js' ],
        options: {
          reload: true
        }
      },
      peg: {
        files: [ 'parser.pegjs' ],
        tasks: [ 'peg' ]
      },
      bundle: {
        files: [ '*.js', 'web/*.js', '!Gruntfile.js', '!web/bundle.js' ],
        tasks: [ 'copy', 'browserify', 'extract_sourcemap' ]
      }
    },
    peg: {
      options: {
        trackLineAndColumn: true
      },
      parser: {
        src: 'parser.pegjs',
        dest: 'parser.js',
        options: {
          cache: true,
          wrapper: function(src, parser) {
            return 'export default ' + parser;
          }
        }
      }
    },
    copy: {
      files: {
        expand: true,
        src: [ 'web/main.html', 'web/main.css' ],
        dest: 'dist/'
      }
    },
    browserify: {
      dist: {
        files: {
          'dist/web/bundle.js': 'web/main.js'
        }
      },
      options: {
        transform: [
          [ 'babelify', { loose: 'all' } ]
        ],
        browserifyOptions: {
          debug: true,
          basedir: 'dist/web'
        }
      }
    },
    extract_sourcemap: {
      dist: {
        files: {
          'dist/web': [ 'dist/web/bundle.js' ]
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-babel');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-extract-sourcemap');
  grunt.loadNpmTasks('grunt-peg');

  grunt.registerTask('default', [ 'watch' ]);
};
