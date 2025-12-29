const CargoType = {
    FOOD: 'food',
    ENERGY: 'energy',
    MATERIAL: 'material',
    DATA: 'data',
    WILD: 'wild'
};

const CargoColor = {
    RED: 'red',
    BLUE: 'blue',
    GREEN: 'green',
    YELLOW: 'yellow',
    WILD: 'wild'
};

class CargoCard {
    constructor(type, color) {
        this.type = type;
        this.color = color;
        this.isWildcard = type === CargoType.WILD || color === CargoColor.WILD;
        this.locked = false;
    }
}

class FunctionCard {
    constructor(name, description) {
        this.name = name;
        this.description = description;
    }
}

class Deck {
    constructor(cards = []) {
        this.cards = cards;
    }

    shuffle() {
        this.cards.sort(() => Math.random() - 0.5);
    }

    draw() {
        return this.cards.shift();
    }

    add(card) {
        this.cards.push(card);
    }
}

module.exports = { CargoCard, FunctionCard, Deck, CargoType, CargoColor };

