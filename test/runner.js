var Execution = require('../');

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
        var contents = inputs.map(function(record){
            return record.contents;
        }).reduce(function (c1, c2) {
                return String(c1) + String(separator) + String(c2);
            })
        resolve({contents: contents});
    }
});

var concat = new Concat();
concat.run(
    [ {contents: 'file1'}, {contents: 'file2'}, {contents: 'file3'} ],
    { separator: "+" }
).then(function(res){
        console.log(res.contents);
        assert.equal(res.contents, 'file1+file2+file3');
    }, function(err){
        console.log(err.message);
    });
