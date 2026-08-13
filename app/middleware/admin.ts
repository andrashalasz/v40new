export default defineNuxtRouteMiddleware(async () => {
  const { user } = useUserSession()
  
    if (!user.value) {
      return navigateTo('/login');
    }
    
    if (user.value.role !== 'ADMIN') {
      return navigateTo('/');
    }
  });
  