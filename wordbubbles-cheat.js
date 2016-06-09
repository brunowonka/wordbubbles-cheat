var LineByLineReader = require('line-by-line');
var lr = new LineByLineReader('words');

var Q = require('q');
var readline = require('readline'), rl;


console.log("opening words");


var WORDS = [],
    WORDCOUNT = 0;
var PIVOTS = {};


lr.on('error', function (err) {
    // 'err' contains error object
    console.log("read error" + err);
});

lr.on('line', function (line) {
    lr.pause();
    // 'line' contains the current line without the trailing newline character.
    WORDS.push(line);
    WORDCOUNT++;
    lr.resume();
});

lr.on('end', function () {
    // All lines are read, file is closed now.
    console.log("done");


    Q.fcall(buildPivots)
        .then(function () {
            rl = readline.createInterface(process.stdin, process.stdout);
        })
         .then(promptTree)
        .then(loadTree)
         .then(promptSize)
        .then(loadSize)
        .then(run)
        .then(final)
        .then(solve)
        .then(function () {
            rl.close();
            process.stdin.destroy();
        })
        .done();
});


function buildPivots() {

    console.log("building pivots");
    var i, l = WORDS.length, c;
    var last = null;
    for (i = 0; i < l; i++) {
        c = WORDS[i][0];
        if (c != last) {
            last = c;
            PIVOTS[c] = i;
        }
    }


    console.log("done pivots");
}


function dims(letters) {
    var a = letters.split(";");
    var l = null;
    if (a.some(function (v) {
            if (l && v.length != l) {
                return true;
            } else {
                l = v.length;
            }
        })) {
        return null;
    }
    return [a, l];
}


function promptSize() {
    var deferred = Q.defer();
    console.log("prompting word sizes");
    var ask;

    var cb = function (line) {
        line = line.trim();
        if (line.match(/^[0-9\,]+$/i) != null) {
//            console.log("valid line");
            deferred.resolve(line);
        } else {
            console.log("invalid entry");
            ask();
        }
    };

    ask = function () {
        rl.question("enter word sizes> ", cb);
    };
    ask();
    return deferred.promise;
}

function promptTree() {
    var deferred = Q.defer();
    console.log("prompting tree");
//    setTimeout(function(){
//        return deferred.resolve();
//    },1000);


    var ask;

    var cb = function (line) {
        line = line.trim();
        if (line.match(/^[a-z\.;]+$/i) && dims(line) != null) {
//            console.log("valid line");
            deferred.resolve(line);
        } else {
            console.log("invalid entry");
            ask();
        }
    };

    ask = function () {
        rl.question("enter letter matrix> ", cb);
    };
    ask();
    return deferred.promise;
}


var MATRIX = [],
    WORD_SIZES = [],
    MIN_WORD = 0,
    MAX_WORD = 0;

function printMatrix() {
    var i, j;
    for (i = 0; i < MATRIX.length; i++) {
        var ln = [];
        for (j = 0; j < MATRIX[i].length; j++) {
            ln.push(MATRIX[i][j]);
        }
        console.log(ln.join(" "));
    }
}

function loadTree(line) {
    if (!line) {
        // line = "ifarf;rtyut;etlia;pznup;deirq";
        line = "nerae;hotgr;tniat;adato;prenp"
    }
    console.log("loading tree " + line);

    var a = line.split(";");
    a.forEach(function (v) {
        MATRIX.push(v.split(""));
    });


    // var acc = [];
    // for (i = 0; i < l; i++) {
    //     if (i % dim == 0 && i != 0) {
    //         MATRIX.push(acc);
    //         acc = [];
    //     }
    //     acc.push(line[i]);
    // }
    // MATRIX.push(acc);
    printMatrix();
}

function loadSize(line) {
    if (!line) {
        line = "6,6,6,7";
    }

    var a = line.split(",");
    WORD_SIZES = a.map(function (v) {
        return parseInt(v);
    });
    WORD_SIZES.sort(function compareNumbers(a, b) {
        return a - b;
    });


    MIN_WORD = WORD_SIZES[0];
    MAX_WORD = WORD_SIZES[WORD_SIZES.length - 1];

}


function samePoint(a, b) {
    return a[0] == b[0] && a[1] == b[1];
}

function pointInArray(point, a) {
    var i, l = a.length;
    for (i = 0; i < l; i++) {
        if (samePoint(a[i], point)) {
            return true;
        }
    }
    return false;
}

var FOUND = [];

function run() {

    var i, j;
    for (i = 0; i < MATRIX.length; i++) {
        for (j = 0; j < MATRIX[i].length; j++) {
            var used = [],
                c = MATRIX[i][j];
            used.push([i, j]);
            check(c, used, [i, j], 0, PIVOTS[c]);
        }
    }

}


function positionDelta(position, index) {
    var r = [position[0], position[1]];
    if (index == 2 || index == 4 || index == 7) {
        r[0] += 1;
    } else if (index == 0 || index == 3 || index == 5) {
        r[0] -= 1;
    }
    if (index < 3) {
        r[1] -= 1;
    } else if (index > 4) {
        r[1] += 1;
    }

    return validPosition(r) ? r : null;
}

function validPosition(r) {
    return r[0] < MATRIX[0].length && r[1] < MATRIX.length && r[0] >= 0 && r[1] >= 0;
}

var DELTA_COUNT = 8;


function findDictStart(from, base, look) {
    var i = from;
    while (i < WORDCOUNT && WORDS[i].indexOf(base) === 0) {
        if (WORDS[i].indexOf(look) === 0) {
            return i;
        }
        i++;
    }
    return -1;
}

function grabLetter(position) {
    return MATRIX[position[0]][position[1]];
}

function check(base, used, position, index, dictIndex) {
//    console.log(JSON.stringify(arguments));
    var nxt = positionDelta(position, index);
    var nextIndex = function () {
        index++;
        if (index < DELTA_COUNT) {
            check(base, used, position, index, dictIndex);
        }
    };


    if (nxt == null || pointInArray(nxt, used)) {
        nextIndex();
    } else {
        var exp = base + grabLetter(nxt);
        var st = findDictStart(dictIndex, base, exp);
        if (st < 0) {
            nextIndex();
        } else {

            var cp = used.slice();
            cp.push(nxt);

            if (WORDS[st] === exp) {
                if (exp.length >= MIN_WORD && exp.length <= MAX_WORD) {
                    FOUND.push({
                        "word": exp,
                        "used": cp.slice()
                    });
                }
//                console.log("found " + exp);
            }


            check(exp, cp, nxt, 0, st);

            nextIndex();
        }
    }
}


function printWord(obj) {
    var str = obj.word;
    var i, j = obj.used.length;
    for (i = 0; i < j; i++) {
        str += " " + obj.used[i].join(",");
    }
    console.log(str);
}


function final() {

    FOUND.sort(function (a, b) {
        if (a.word.length != b.word.length) {
            return -1 * (a.word.length - b.word.length);
        } else {
            return a.word.localeCompare(b.word);
        }
    });

}


function poolGetWords(pool, found, pools, forbidden) {
    var allcombs = [];
    pool.forEach(function (v) {
        if (!v.used.some(function (v) {
                return pointInArray(v, forbidden);
            })) {
            // console.log(v,forbidden);
            var f = found.slice();
            f.push(v);

            if (pools.length) {
                var n = forbidden.concat(forbidden, v.used);
                allcombs = allcombs.concat(poolGetWords(pools[0], f, pools.slice(1), n));
            } else {
                allcombs.push(f);
            }
        }
    });

    // console.log(allcombs);
    return allcombs;
}


function hasSolution(solution,array) {
    return array.some(function(v){
        return solution.every(function(s){
            return !!v.find(function (sv) {
                return sv.word === s.word;
            });
        })
    });
}

function solve() {
    var pools = [];
    WORD_SIZES.forEach(function (v) {
        pools.push(FOUND.filter(function (o) {
            return (o.word.length === v);
        }));
    });

    var pool0 = pools[0],
        rest = pools.slice(1);

    var R = poolGetWords(pool0, [], rest, []);
    var f = [];
    R.forEach(function(v){
        if( !hasSolution(v,f) ) {
            f.push(v);
        }
    });

    var f2 = [];

    FOUND = FOUND.filter(function(obj){
        if(f2.indexOf(obj.word) >= 0 ) {
            return false;
        } else {
            f2.push(obj.word);
            return true;
        }
    });
    console.log("FOUND " + FOUND.length);
    for (var i = 0; i < FOUND.length; i++) {
        console.log(">  " + FOUND[i].word);
    }


    f.forEach(function (v) {
        console.log("found solution: ", v.map(function (v) {
            return v.word;
        }).join(", "));
    });



}
