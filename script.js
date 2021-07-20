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
    #editingWorkout = null;
    #isEditing = false;

    #STORAGE_KEY = 'workouts';
    #MAP_ZOOM_LEVEL = 13;

    constructor() {
        this._getPosition();
        this._getStorageWorkouts();

        // Switch between workout types (running | cycling)
        inpType.addEventListener('change', e =>
            this._toggleWorkoutType(e.target.value)
        );

        // When a workout is created or edited
        form.addEventListener('submit', this._newWorkout.bind(this));

        // For performing actions on the workout (edit, delete)
        workouts.addEventListener('click', e => {
            const workoutEl = e.target.closest('.workout');
            if (!workoutEl) return;

            const workout = this.#workouts.find(
                w => w.id === workoutEl.dataset.id
            );

            if (workoutEl) this._moveMap(workout.coords);
            if (e.target.classList.contains('btn-edit'))
                this._editWorkout(workout);
            if (e.target.classList.contains('btn-delete'))
                this._deleteWorkout(workout, workoutEl);
        });

        // Delete all workouts
        btnDeleteAll.addEventListener(
            'click',
            this._deleteAllWorkouts.bind(this)
        );
    }

    _deleteAllWorkouts() {
        this.#workouts = [];
        localStorage.removeItem(this.#STORAGE_KEY);

        // remove list workouts
        document.querySelectorAll('.workout').forEach(el => el.remove());

        // remove markers
        this.#map.eachLayer(layer => {
            if (layer._latlng) this.#map.removeLayer(layer);
        });
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

        inpType.disabled = false;
        this._toggleWorkoutType(inpType.value);
    }

    _toggleWorkoutType(type) {
        const formRunning = inpCadence.closest('.form__row');
        const formCycling = inpElevation.closest('.form__row');

        if (type === 'running') {
            formRunning.classList.remove('hidden');
            formCycling.classList.add('hidden');
        } else if (type === 'cycling') {
            formRunning.classList.add('hidden');
            formCycling.classList.remove('hidden');
        }
    }

    _newWorkout(e) {
        e.preventDefault();

        const type = inpType.value;
        const distance = +inpDistance.value;
        const duration = +inpDuration.value;
        const cadence = +inpCadence.value;
        const elevationGain = +inpElevation.value;

        let workout = {};

        const coords = this.#editingWorkout
            ? this.#editingWorkout.coords
            : this.#coords;

        // prettier-ignore
        if (type === 'running') {
            if (
                !allNumbers(distance, duration, cadence) ||
                !allPositive(distance, duration, cadence)
            ) return alert('Inputs have to be positive numbers...');

            workout = new Running(coords, distance, duration, cadence);
        }

        // prettier-ignore
        if (type === 'cycling') {
            if (
                !allNumbers(distance, duration, elevationGain) ||
                !allPositive(distance, duration)
            ) return alert('Inputs have to be positive numbers...');

            workout = new Cycling(coords, distance, duration, elevationGain);
        }

        if (this.#isEditing) {
            // Edit workout
            this.#workouts = this.#workouts.map(w => {
                if (w.id === this.#editingWorkout.id) w = workout;
                return w;
            });

            const markup = this._generateWorkoutMarkup(workout);

            const workoutEl = document.querySelector(
                `[data-id="${this.#editingWorkout.id}"]`
            );

            const newWorkoutEl = document.createElement('div');
            newWorkoutEl.innerHTML = markup;

            workoutEl.parentNode.replaceChild(
                newWorkoutEl.children[0],
                workoutEl
            );
        } else {
            // Add workout
            this.#workouts.push(workout);
            this._renderOnList(workout);
            this._renderOnMap(workout);
        }

        this._saveWorkoutsToStorage();
        this._hideForm();

        // Reset to defaults
        this.#coords = [];
        this.#editingWorkout = null;
        this.#isEditing = false;
    }

    // prettier-ignore
    _generateWorkoutMarkup(workout) {
        let markup = `
            <li class="workout workout--${workout.type}" data-id="${workout.id}">
                <h2 class="workout__title">${workout.description}</h2>
                <button class="btn btn-delete">Delete</button>
                <button class="btn btn-edit">Edit</button>

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

    _moveMap(coords) {
        this.#map.setView(coords, this.#MAP_ZOOM_LEVEL, {
            animate: true,
            pan: { duration: 1 }
        });
    }

    _deleteWorkout(workout, element) {
        const index = this.#workouts.indexOf(workout);

        this.#workouts.splice(index, 1); // Remove from array
        element.remove(); // Remove from list

        // Remove from map (marker)
        this.#map.eachLayer(layer => {
            if (
                layer._latlng?.lat === workout.coords[0] &&
                layer._latlng?.lng === workout.coords[1]
            )
                this.#map.removeLayer(layer);
            this._saveWorkoutsToStorage();
        });
    }

    _editWorkout(workout) {
        this.#isEditing = true;
        this.#editingWorkout = workout;

        this._showForm();
        this._toggleWorkoutType(workout.type);

        // Disables changing workout type while editing
        inpType.disabled = true;

        // Set values to the editing workout values
        inpType.value = workout.type;
        inpDistance.value = workout.distance;
        inpDuration.value = workout.duration;
        inpCadence.value = workout.cadence;
        inpElevation.value = workout.elevationGain;
    }
}

const form = document.querySelector('.form');
const workouts = document.querySelector('.workouts');

const btnDeleteAll = document.querySelector('.btn-deleteall');

const inpDistance = document.querySelector('.form__input--distance');
const inpDuration = document.querySelector('.form__input--duration');
const inpCadence = document.querySelector('.form__input--cadence');
const inpElevation = document.querySelector('.form__input--elevation');
const inpType = document.querySelector('.form__input--type');

const app = new App();
