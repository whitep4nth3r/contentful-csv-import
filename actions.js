module.exports.transformations = {
    // Use the key to transform followed by a function which has value as input
    description: (value) => {
        var separateWord = value.toLowerCase().split(' ');
        for (var i = 0; i < separateWord.length; i++) {
            separateWord[i] = separateWord[i].charAt(0).toUpperCase() +
                separateWord[i].substring(1);
        }
        return separateWord.join(' ');
    }
}