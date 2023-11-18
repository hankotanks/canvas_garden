const onlyInLeft = (left, right, compareFunction) => 
  stored_assignments.filter(sta =>
    !current_assignments.some(ca => 
      sta.id === ca.id));

const Courses = class {
    constructor() {
        this.token = $('#token').text();
        this.user = $('#user').text();

        this.socket = io.connect(`http://localhost:${window.ENV.port}`);
        this.socket.emit('getOldAssignments', { user: this.user, token: this.token });
        this.socket.emit('getResourceCounts', this.user);

        this.socket.on('getResourceCounts', resources => {
            this.resources = resources;

            $('#resources').text(`Seeds: ${this.resources.seeds}`);
        });

        this.socket.on('getOldAssignments', stored_assignments => {
            stored_assignments = stored_assignments ? stored_assignments : [];

            this.socket.emit('getCurrentAssignments', this.token);
            this.socket.on('getCurrentAssignments', current_assignments => {

                let completed_assignments = stored_assignments.filter(
                    sta => !current_assignments.some(ca => sta.id === ca.id));
                for(let i = 0; i < completed_assignments.length; i++) {
                    $('#courses').append(`<li><button id="assignment-${completed_assignments[i].id}">${ completed_assignments[i].title } (${ completed_assignments[i].course_name })</button></li>`);
                    $(`#assignment-${completed_assignments[i].id}`).on('click', _ => {
                        $(`#assignment-${completed_assignments[i].id}`).remove();

                        this.socket.emit('redeemAssignment', this.user);

                        
                    });
                }

                for(let i = 0; i <  current_assignments.length; i++) {
                    $('#courses').append(`<li>${ current_assignments[i].title } (${ current_assignments[i].course_name })</li>`);
                }

                this.socket.emit('storeAssignments', { user: this.user, token: this.token, assignments: current_assignments });
            });
        });

        this.courses = [];
        this.socket.on('getCourses', courses => this.courses = courses);

        

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