Execution
=========

Execution class for javascript task.

## Installation

```
npm install execution
```

## Usage

```js
var Execution = require('execution');

var Concat = Execution.extend({
    options: {
        separator: {
            description: "Concatenated input will be joined on this string.",
            default: process.platform === 'win32' ? '\r\n' : '\n'
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
    }, function(err){
        console.log(err.message);
    });
```

## Release History
* 2014-03-28    0.1.0    Initial release.

## License
Copyright (c) 2014 Yuanyan Cao. Licensed under the MIT license.
