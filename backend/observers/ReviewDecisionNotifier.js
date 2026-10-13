// send notifications to observers
class ReviewDecisionNotifier {
    constructor() {
        this.observers = [];
    }

    subscribe(observer) {
        this.observers.push(observer);
    }

    async notify(result) {
        for (const observer of this.observers) {
            try {
                await observer.update(result);
            } catch (error) {
                console.error(`Error notifying observer: ${error.message}`);
            }
        }
    }
}

module.exports = ReviewDecisionNotifier;
