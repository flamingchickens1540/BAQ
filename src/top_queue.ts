type Comparator<T> = (one: T, two: T) => number;

/*
 * A queue structure which keeps track of the highest valued item in the list
 */
export class TopQueue<T> {
    queue: T[];
    top: T;
    compare: Comparator<T>;

    constructor(initial: T[], comparator: Comparator<T>) {
        this.queue = initial;
        this.compare = comparator;

        this.top = initial.length == 1 ? initial[0] : this.get_best_list();
    }

    get(i: number): T {
        return this.queue[i];
    }

    push(val: T) {
        if (this.compare(this.top, val) > 0) {
            this.top = val;
        }
        this.queue.push(val);
    }

    pop(): T | undefined {
        const val = this.queue.pop();
        if (val == undefined) return;

        if (this.compare(this.top, val) > 0) {
            this.top = val;
        }
    }

    get_best(one: T, two: T): T {
        return this.compare(one, two) < 0 ? one : two;
    }

    get_best_index(i: number, j: number): number {
        return this.compare(this.queue[i], this.queue[j]) < 0 ? i : j;
    }

    get_best_list(): T {
        let best = 0;
        for (let i = 0; i < this.queue.length; i++) {
            best = this.get_best_index(i, best);
        }

        return this.queue[best];
    }
}
