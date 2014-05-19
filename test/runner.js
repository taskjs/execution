var Execution = require('../');
var assert = require('assert');

var Concat = Execution.extend({
    options: {
        separator: {
            default: process.platform === 'win32' ? '\r\n' : '\n',
            type: 'string',
            label: 'separator string',
            placeholder: 'concatenated input will be joined on this string'
        }
    },
    execute: function(resolve){
        var inputs = this.inputs;
        var options = this.options;
        var separator = options.separator;
        var contents = '';

        if(inputs.length > 2){
            contents = inputs.map(function(record){
                return record.contents;
            }).reduce(function (c1, c2) {
                return String(c1) + String(separator) + String(c2);
            });
        }

        setTimeout(function(){
            resolve({contents: contents});
        }, 200)

    }
});

(new Concat).run(
    [ {contents: 'file1'}, {contents: 'file2'}, {contents: 'file3'} ],
    { separator: "+" },
    console
).then(function(res){
        console.log(res.contents);
        assert.equal(res.contents, 'file1+file2+file3');
    }, function(err){
        console.log(err.message);
    }).catch(function(e){
        process.nextTick(function () {
            throw e;
        });
    });


(new Concat).run(
    [ {contents: 'file1'}, {contents: 'file2'}, {contents: 'file3'} ],
    { separator: "+" },
    console,
    {
        timeout: 100
    }
).then(function(res){
        console.log(res.contents);
        assert.equal(res.contents, 'file1+file2+file3');
    }, function(err){
        console.log(err.message);
        assert.equal(err.message, 'Execution timed out.');
    }).catch(function(e){
        process.nextTick(function () {
            throw e;
        });
    });


(new Concat).run(
    [ {contents: 'file1'}, {contents: 'file2'}, {contents: 'file3'} ],
    { separator: "+" },
    console,
    {
        ignore: true
    }
).then(function(res){
        assert.equal(res.contents, '');
    }, function(err){
        console.log(err.message);
        throw err;
    }).catch(function(e){
        process.nextTick(function () {
            throw e;
        });
    });