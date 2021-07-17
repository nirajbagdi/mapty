'use strict';

class Workout {
    id = (Date.now() + '').slice(0, 10);
    date = new Date();

    constructor(coords, distance, duration) {
        this.coords = coords;
        this.distance = distance;
        this.duration = duration;
    }

    _setDescription() {
        // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${capitalize(this.type)} on ${
            months[this.date.getMonth()]
        } ${this.date.getDate()}`;
    }
}

class Running extends Workout {
    type = 'running';

    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this._calcPace();
        this._setDescription();
    }

    _calcPace() {
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

class Cycling extends Workout {
    type = 'cycling';

    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this._calcSpeed();
        this._setDescription();
    }

    _calcSpeed() {
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

class App {
    #workouts = [];
    #coords = [];
    #map = null;

    #STORAGE_KEY = 'workouts';
    #MAP_ZOOM_LEVEL = 13;

    constructor() {
        this._getPosition();
        this._getStorageWorkouts();

        // Event listeners
        inpType.addEventListener('change', this._toggleWorkoutType);
        form.addEventListener('submit', this._newWorkout.bind(this));
        workouts.addEventListener('click', this._moveMap.bind(this));
    }

    _getPosition() {
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                this._loadMap([latitude, longitude]);
            },
            error => console.log(error)
        );
    }

    _loadMap(coords) {
        this.#map = L.map('map').setView(coords, this.#MAP_ZOOM_LEVEL);

        L.tileLayer(
            'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'
        ).addTo(this.#map);

        // Click event on map
        this.#map.on('click', e => {
            this.#coords = [e.latlng.lat, e.latlng.lng];
            this._showForm();
        });

        // Render workouts from localstorage once map is loaded
        this.#workouts.forEach(workout => {
            this._renderOnList(workout);
            this._renderOnMap(workout);
        });
    }

    _showForm() {
        form.classList.remove('hidden');
        inpDistance.focus();
    }

    _hideForm() {
        form.classList.add('hidden');

        inpType.value = 'running';
        inpDistance.value = '';
        inpDuration.value = '';
        inpCadence.value = '';
        inpElevation.value = '';
    }

    _toggleWorkoutType() {
        inpElevation.closest('.form__row').classList.toggle('hidden');
        inpCadence.closest('.form__row').classList.toggle('hidden');
    }

    _newWorkout(e) {
        e.preventDefault();

        const type = inpType.value;
        const distance = +inpDistance.value;
        const duration = +inpDuration.value;
        const cadence = +inpCadence.value;
        const elevationGain = +inpElevation.value;

        let workout = {};

        // prettier-ignore
        if (type === 'running') {
            if (
                !allNumbers(distance, duration, cadence) ||
                !allPositive(distance, duration, cadence)
            ) return alert('Inputs have to be positive numbers...');

            workout = new Running(this.#coords, distance, duration, cadence);
        }

        // prettier-ignore
        if (type === 'cycling') {
            if (
                !allNumbers(distance, duration, elevationGain) ||
                !allPositive(distance, duration)
            ) return alert('Inputs have to be positive numbers...');

            workout = new Cycling(this.#coords, distance, duration, elevationGain);
        }

        this.#workouts.push(workout);
        this._saveWorkoutsToStorage();

        this._renderOnList(workout);
        this._renderOnMap(workout);

        // Reset to defaults
        this._hideForm();
        this.#coords = [];
    }

    // prettier-ignore
    _generateWorkoutMarkup(workout) {
        let markup = `
            <li class="workout workout--${workout.type}" data-id="${workout.id}">
                <h2 class="workout__title">${workout.description}</h2>

                <div class="workout__details">
                    <span class="workout__icon">
                        ${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}
                    </span>
                    <span class="workout__value">${workout.distance}</span>
                    <span class="workout__unit">km</span>
                </div>

                <div class="workout__details">
                    <span class="workout__icon">⏱</span>
                    <span class="workout__value">${workout.duration}</span>
                    <span class="workout__unit">min</span>
                </div>
        `;

        if (workout.type === 'running')
            markup += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.pace.toFixed(1)}</span>
                    <span class="workout__unit">min/km</span>
                </div>

                <div class="workout__details">
                    <span class="workout__icon">🦶🏼</span>
                    <span class="workout__value">${workout.cadence}</span>
                    <span class="workout__unit">spm</span>
                </div>
            </li>
            `;

        if (workout.type === 'cycling')
            markup += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.speed.toFixed(1)}</span>
                    <span class="workout__unit">km/hr</span>
                </div>

                <div class="workout__details">
                    <span class="workout__icon">⛰</span>
                    <span class="workout__value">${workout.elevationGain}</span>
                    <span class="workout__unit">m</span>
                </div>
            </li>
            `;

        return markup;
    }

    _renderOnList(workout) {
        const markup = this._generateWorkoutMarkup(workout);
        form.insertAdjacentHTML('afterend', markup);
    }

    _renderOnMap(workout) {
        L.marker(workout.coords)
            .addTo(this.#map)
            .bindPopup(
                L.popup({
                    autoClose: false,
                    closeOnClick: false,
                    className: `${workout.type}-popup`
                })
            )
            .setPopupContent(
                `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${
                    workout.description
                }`
            )
            .openPopup();
    }

    _saveWorkoutsToStorage() {
        localStorage.setItem(this.#STORAGE_KEY, JSON.stringify(this.#workouts));
    }

    _getStorageWorkouts() {
        const workouts = JSON.parse(localStorage.getItem(this.#STORAGE_KEY));
        if (!workouts) return;
        this.#workouts = workouts;
    }

    _moveMap(e) {
        const list = e.target.closest('.workout');
        if (!list) return;

        const workout = this.#workouts.find(w => w.id === list.dataset.id);

        this.#map.setView(workout.coords, this.#MAP_ZOOM_LEVEL, {
            animate: true,
            pan: { duration: 1 }
        });
    }
}

const form = document.querySelector('.form');
const workouts = document.querySelector('.workouts');

const inpDistance = document.querySelector('.form__input--distance');
const inpDuration = document.querySelector('.form__input--duration');
const inpCadence = document.querySelector('.form__input--cadence');
const inpElevation = document.querySelector('.form__input--elevation');
const inpType = document.querySelector('.form__input--type');

const app = new App();
