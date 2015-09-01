module.exports = function (grunt) {

    grunt.initConfig({
        nodemon: {
            dev: {
                script: 'bin/www',
                options: {
                    args: ['dev'],
                    ignore: ["node_modules/**", ".git/", "public/", "Gruntfile.js"],
                    watchedFolders: ['routes', 'modules'],
                    //nodeArgs: ['--debug'],
                    callback: function (nodemon) {
                        nodemon.on('log', function (event) {
                            console.log(event.colour);
                        });
                    }
                }
            }
        }
    });


    grunt.loadNpmTasks('grunt-nodemon');

    grunt.registerTask('default', ['nodemon']);

};