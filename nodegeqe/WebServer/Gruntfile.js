module.exports = function (grunt) {

    grunt.initConfig({
        nodemon: {
            dev: {
                script: 'bin/www',
                options: {
                    args: ['dev'],
                    nodeArgs: ['--debug'],
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