/// Durstenfeld shuffles a list
export function shuffleList<T>(list: T[]) {
	for (let i = list.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[list[i], list[j]] = [list[j], list[i]];
	}
}

/// Perfoms a deep clone of the object
export function deepClone<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj)) as T;
}

export function sum(arr: number[]): number {
	return arr.reduce((acc, current) => acc + current);
}
