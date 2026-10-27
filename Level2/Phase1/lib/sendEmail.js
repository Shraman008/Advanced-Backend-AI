const sendEmail = async(email) => {
    await new Promise((resolve) => {
        setTimeout(resolve, 5000)  // simulate a delay of 5 seconds
    })

    console.log('task sent ');
}

export default sendEmail;

