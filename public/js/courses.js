const Courses = class {
    constructor() {
        this.token = $('#token').text();

        this.socket = io.connect(`http://localhost:${window.ENV.port}`);
        this.socket.emit('getCourses', this.token);
        this.socket.emit('getAssignments', this.token);

        this.courses = [];
        this.socket.on('getCourses', courses => this.courses = courses);

        this.socket.on('getAssignments', assignments => {
            for(let i = 0; i < assignments.length; i++) {
                $('#courses').append(`<li>${ assignments[i].title } (${ assignments[i].course_name })</li>`);
            }
        });

        this.socket.on('error', error => {
            const formatted_error = `
                <p>ENCOUNTERED ERROR:<p>
                <br />
                <p>${error}</p>
            `;

            $('#container').html(formatted_error);
        })
    }
}